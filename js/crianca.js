import { db, storage, collection, addDoc, onSnapshot, query, where, doc, updateDoc, deleteDoc, serverTimestamp, runTransaction, ref, uploadBytesResumable, getDownloadURL, deleteObject, listAll } from "./firebase-config.js";
import { saldoDisponivelCentavos, formatarReais } from "./calculos.js";

const TAMANHO_MAXIMO_PX = 1280;
const TAMANHO_ALVO_BYTES = 500 * 1024;
const MAX_ANEXOS = 5;
const TAMANHO_MAXIMO_VIDEO_BYTES = 15 * 1024 * 1024;

async function apagarAnexos(tarefaId) {
  const pasta = ref(storage, "tarefas/" + tarefaId + "/anexos");
  const lista = await listAll(pasta).catch(() => null);
  if (!lista) return;
  await Promise.all(lista.items.map((item) => deleteObject(item).catch(() => {})));
}

async function comprimirImagem(arquivo) {
  const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  const escala = Math.min(1, TAMANHO_MAXIMO_PX / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, largura, altura);

  let qualidade = 0.8;
  let blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", qualidade));
  while (blob.size > TAMANHO_ALVO_BYTES && qualidade > 0.3) {
    qualidade -= 0.1;
    blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", qualidade));
  }
  return blob;
}

const nomesExibidos = { anthony: "Anthony", gabriel: "Gabriel" };
const criancaId = sessionStorage.getItem("perfilAtivo");

document.getElementById("saudacao").textContent = "Olá, " + (nomesExibidos[criancaId] || criancaId) + "!";

const listaFazer = document.getElementById("pfazer");
const listaConcluidas = document.getElementById("pconcluidas");
const listaPerdidas = document.getElementById("pperdidas");
const listaRecurso = document.getElementById("precurso");
const listaRecebido = document.getElementById("precebido");
const listaBonus = document.getElementById("bonus");
const saldoElemento = document.querySelector(".saldo");
const tarefasQuery = query(collection(db, "tarefas"), where("criancaId", "==", criancaId));

// Tarefa só fica visível pra criança a partir das 00h do dia do prazo,
// mesmo tendo sido criada antes — evita "spoiler" de tarefas futuras em lote.
function tarefaVisivelHoje(tarefa) {
  const prazoData = tarefa.prazo.toDate();
  const inicioDoDiaPrazo = new Date(prazoData.getFullYear(), prazoData.getMonth(), prazoData.getDate());
  return new Date() >= inicioDoDiaPrazo;
}

async function expirarSeVencida(tarefaId, tarefa) {
  if (tarefa.status !== "disponivel" && tarefa.status !== "aberta") return;
  if (tarefa.prazo.toDate() < new Date()) {
    await updateDoc(doc(db, "tarefas", tarefaId), { status: "perdida", dataPerda: serverTimestamp(), causaPerda: "expiracao" });
  }
}

async function excluirTarefa(tarefaId, tarefa) {
  if (tarefa.pago) return;
  if (!confirm("Tem certeza que quer excluir essa tarefa? Essa ação não pode ser desfeita.")) return;
  await deleteDoc(doc(db, "tarefas", tarefaId));
}

function formatarPrazo(prazoTimestamp) {
  const data = prazoTimestamp.toDate();
  const diffHoras = (data - new Date()) / (1000 * 60 * 60);
  let contagem;
  if (diffHoras < 0) contagem = "vencido";
  else if (diffHoras < 24) contagem = "vence em menos de 1 dia";
  else contagem = `vence em ${Math.ceil(diffHoras / 24)} dia(s)`;
  return `${data.toLocaleString("pt-BR")} (${contagem})`;
}

async function abrirChamado(tarefaId, tarefa) {
  const motivo = prompt("Explique por que essa tarefa não deveria ter sido perdida:");
  if (motivo === null) return;
  if (motivo.trim() === "") {
    alert("É necessário explicar o motivo do chamado.");
    return;
  }
  try {
    const chamadoRef = await addDoc(collection(db, "chamados"), {
      tarefaId,
      criancaId,
      nomeTarefa: tarefa.nome,
      valorCentavos: tarefa.valorCentavos,
      status: "aberto",
      dataAbertura: serverTimestamp(),
      dataResolucao: null,
    });
    await addDoc(collection(db, "chamados", chamadoRef.id, "mensagens"), {
      autor: criancaId,
      texto: motivo.trim(),
      data: serverTimestamp(),
    });
    await updateDoc(doc(db, "tarefas", tarefaId), {
      status: "em_recurso",
      chamadoId: chamadoRef.id,
    });
  } catch (erro) {
    console.error(erro);
    alert("Não foi possível abrir o chamado. Tente novamente.");
  }
}

onSnapshot(tarefasQuery, (snapshot) => {
  listaFazer.innerHTML = "<h3>Tarefas para fazer</h3>";
  listaConcluidas.innerHTML = "<h3>Concluídas</h3>";
  listaPerdidas.innerHTML = "<h3>Perdidas</h3>";
  listaRecurso.innerHTML = "<h3>Em recurso</h3>";
  var temFazer = false;
  var temConcluidas = false;
  var temPerdidas = false;
  var temRecurso = false;
  const tarefasAprovadas = [];

  snapshot.forEach((docSnap) => {
    const tarefa = docSnap.data();
    const tarefaId = docSnap.id;
    if (tarefa.status === "disponivel" && !tarefaVisivelHoje(tarefa)) return;
    expirarSeVencida(tarefaId, tarefa);
    const valorReais = formatarReais(tarefa.valorCentavos);
    const item = document.createElement('div');

    if (tarefa.status === "disponivel") {
      const tentativasRestantes = 3 - (tarefa.tentativas || 0);
      let avisoRejeicao = "";
      if (tarefa.motivoRejeicao) avisoRejeicao = `<p class="motivo-rejeicao">Rejeitada: ${tarefa.motivoRejeicao}</p>`;

      item.innerHTML = `
        <h4>${tarefa.nome}</h4>
        <p>${tarefa.descricao}</p>
        <p>Valor: ${valorReais}</p>
        <p>Prazo: ${formatarPrazo(tarefa.prazo)}</p>
        <p>Tentativas restantes: ${tentativasRestantes}</p>
        ${avisoRejeicao}
        <textarea placeholder="Observação (opcional)" id="obs-${tarefaId}"></textarea>
        <input type="file" id="arquivo-${tarefaId}" accept="image/*,video/*" multiple>
        <p class="dica">Até 5 anexos (fotos ou vídeos de até 15MB)</p>
        <p id="progresso-${tarefaId}"></p>
        <button class="botao">Concluir tarefa</button>
      `;
      item.querySelector("button").addEventListener("click", function () {
        concluirTarefa(tarefaId, tarefa.tentativas || 0);
      });
      listaFazer.appendChild(item);
      temFazer = true;
    } else if (tarefa.status === "aprovada") {
      tarefasAprovadas.push(tarefa);
      const botaoExcluir = tarefa.pago ? "" : `<button class="botao abacaxi6">×</button>`;
      item.innerHTML = `
        <h4>${tarefa.nome}</h4>
        <p>${tarefa.descricao}</p>
        <p>Valor: ${valorReais}</p>
        <p>${tarefa.pago ? "Pago" : "Aguardando pagamento"}</p>
        ${botaoExcluir}
      `;
      const btnExcluir = item.querySelector(".abacaxi6");
      if (btnExcluir) btnExcluir.addEventListener("click", () => excluirTarefa(tarefaId, tarefa));
      listaConcluidas.appendChild(item);
      temConcluidas = true;
    } else if (tarefa.status === "perdida") {
      const motivo = tarefa.motivoRejeicao ? `<p>Motivo: ${tarefa.motivoRejeicao}</p>` : "";
      // tarefas perdidas antes do campo causaPerda existir não têm esse campo
      // gravado (undefined) — tratamos como elegível a chamado, já que a
      // única causa que de fato bloqueia recurso é cancelamento manual.
      const podeAbrirChamado = !tarefa.chamadoId && tarefa.causaPerda !== "cancelamento";
      const botaoChamado = podeAbrirChamado ? `<button class="botao morango-chamado">Abrir chamado</button>` : "";
      item.innerHTML = `
        <h4>${tarefa.nome}</h4>
        <p>${tarefa.descricao}</p>
        <p>Valor: ${valorReais}</p>
        ${motivo}
        ${botaoChamado}
        <button class="botao abacaxi6">×</button>
      `;
      item.querySelector(".abacaxi6").addEventListener("click", () => excluirTarefa(tarefaId, tarefa));
      const btnChamado = item.querySelector(".morango-chamado");
      if (btnChamado) btnChamado.addEventListener("click", () => abrirChamado(tarefaId, tarefa));
      listaPerdidas.appendChild(item);
      temPerdidas = true;
    } else if (tarefa.status === "em_recurso") {
      item.innerHTML = `
        <h4>${tarefa.nome}</h4>
        <p>${tarefa.descricao}</p>
        <p>Valor: ${valorReais}</p>
        <p>Chamado aberto — aguardando decisão do avaliador.</p>
      `;
      listaRecurso.appendChild(item);
      temRecurso = true;
    }
  });

  if (!temFazer) listaFazer.innerHTML += "<p>Nenhuma tarefa ainda.</p>";
  if (!temConcluidas) listaConcluidas.innerHTML += "<p>Nenhuma tarefa concluída ainda.</p>";
  if (!temPerdidas) listaPerdidas.innerHTML += "<p>Nenhuma tarefa perdida.</p>";
  if (!temRecurso) listaRecurso.innerHTML += "<p>Nenhum chamado em aberto.</p>";
  saldoElemento.textContent = "Saldo total: " + formatarReais(saldoDisponivelCentavos(tarefasAprovadas));
});

const pagamentosQuery = query(collection(db, "pagamentos"), where("criancaId", "==", criancaId));

onSnapshot(pagamentosQuery, (snapshot) => {
  listaRecebido.innerHTML = "<h3>Recebido</h3>";
  if (snapshot.empty) {
    listaRecebido.innerHTML += "<p>Nenhum pagamento registrado ainda.</p>";
    return;
  }

  const pagamentos = snapshot.docs
    .map((docSnap) => docSnap.data())
    .sort((a, b) => (b.dataPagamento?.toMillis() || 0) - (a.dataPagamento?.toMillis() || 0));

  pagamentos.forEach((pagamento) => {
    const data = pagamento.dataPagamento ? pagamento.dataPagamento.toDate().toLocaleDateString("pt-BR") : "—";
    const rotulo = pagamento.tipoPagamento === "fechamento" ? "Fechamento de período" : "Pagamento";
    const item = document.createElement("div");
    item.innerHTML = `<p>${data} — ${rotulo} — ${formatarReais(pagamento.valorCentavos)}</p>`;
    listaRecebido.appendChild(item);
  });
});

async function concluirTarefa(tarefaId, tentativasAtuais) {
  const observacao = document.getElementById("obs-" + tarefaId).value;
  const arquivos = Array.from(document.getElementById("arquivo-" + tarefaId).files);
  const progresso = document.getElementById("progresso-" + tarefaId);

  if (arquivos.length === 0) {
    alert("Anexe ao menos uma foto ou vídeo.");
    return;
  }
  if (arquivos.length > MAX_ANEXOS) {
    alert("No máximo " + MAX_ANEXOS + " anexos por tarefa.");
    return;
  }
  for (const arquivo of arquivos) {
    const ehVideo = arquivo.type.startsWith("video/");
    if (!arquivo.type.startsWith("image/") && !ehVideo) {
      alert("Cada anexo precisa ser uma foto ou um vídeo.");
      return;
    }
    if (ehVideo && arquivo.size > TAMANHO_MAXIMO_VIDEO_BYTES) {
      alert("Vídeo muito grande: no máximo 15MB.");
      return;
    }
  }

  try {
    await apagarAnexos(tarefaId);
    const anexos = [];

    for (let indice = 0; indice < arquivos.length; indice++) {
      const arquivo = arquivos[indice];
      const ehVideo = arquivo.type.startsWith("video/");
      progresso.textContent = "Preparando anexo " + (indice + 1) + " de " + arquivos.length + "...";

      const conteudo = ehVideo ? arquivo : await comprimirImagem(arquivo);
      const contentType = ehVideo ? arquivo.type : "image/jpeg";
      const extensao = ehVideo ? (arquivo.name.split(".").pop() || "mp4") : "jpg";
      const arquivoRef = ref(storage, "tarefas/" + tarefaId + "/anexos/" + indice + "." + extensao);
      const envio = uploadBytesResumable(arquivoRef, conteudo, { contentType });

      const url = await new Promise((resolve, reject) => {
        envio.on(
          "state_changed",
          (snapshot) => {
            const percentual = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            progresso.textContent = "Enviando anexo " + (indice + 1) + " de " + arquivos.length + "... " + percentual + "%";
          },
          reject,
          async () => resolve(await getDownloadURL(arquivoRef))
        );
      });

      anexos.push({ url, tipo: ehVideo ? "video" : "imagem", nome: arquivo.name });
    }

    await updateDoc(doc(db, "tarefas", tarefaId), {
      status: "aguardando_aprovacao",
      observacaoCrianca: observacao,
      motivoRejeicao: "",
      tentativas: tentativasAtuais + 1,
      anexos: anexos,
      dataConclusao: serverTimestamp(),
    });
  } catch (erro) {
    console.error(erro);
    progresso.textContent = "";
    alert("Não foi possível enviar os anexos. Tente novamente.");
  }
}

const bonusQuery = query(collection(db, "tarefas"), where("tipoAtribuicao", "==", "bonus"), where("status", "==", "aberta"));

onSnapshot(bonusQuery, (snapshot) => {
  listaBonus.innerHTML = "<h3>Tarefas bônus disponíveis</h3>";
  var temBonus = false;

  snapshot.forEach((docSnap) => {
    const tarefa = docSnap.data();
    const tarefaId = docSnap.id;
    if (!tarefaVisivelHoje(tarefa)) return;
    temBonus = true;
    expirarSeVencida(tarefaId, tarefa);
    const valorReais = formatarReais(tarefa.valorCentavos);

    const item = document.createElement("div");
    item.innerHTML = `
      <h4>${tarefa.nome}</h4>
      <p>${tarefa.descricao}</p>
      <p>Valor: ${valorReais}</p>
      <button class="botao">Aceitar tarefa bônus</button>
    `;
    item.querySelector("button").addEventListener("click", () => aceitarBonus(tarefaId));
    listaBonus.appendChild(item);
  });

  if (!temBonus) listaBonus.innerHTML += "<p>Nenhuma tarefa bônus agora.</p>";
});

async function aceitarBonus(tarefaId) {
  const tarefaRef = doc(db, "tarefas", tarefaId);

  try {
    await runTransaction(db, async (transacao) => {
      const snap = await transacao.get(tarefaRef);
      const tarefa = snap.data();

      if (tarefa.status !== "aberta") {
        throw new Error("Essa tarefa já foi pega por outra pessoa.");
      }

      transacao.update(tarefaRef, {
        criancaId: criancaId,
        status: "disponivel",
        dataAceite: serverTimestamp()
      });
    });
  } catch (erro) {
    alert(erro.message);
  }
}
