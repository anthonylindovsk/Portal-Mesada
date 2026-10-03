import { db, storage, collection, addDoc, onSnapshot, query, where, orderBy, doc, updateDoc, deleteDoc, serverTimestamp, runTransaction, ref, uploadBytesResumable, getDownloadURL, deleteObject, listAll } from "./firebase-config.js";
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
const listaChamados = document.getElementById("precurso");
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
  var temFazer = false;
  var temConcluidas = false;
  var temPerdidas = false;
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
    }
  });

  if (!temFazer) listaFazer.innerHTML += "<p>Nenhuma tarefa ainda.</p>";
  if (!temConcluidas) listaConcluidas.innerHTML += "<p>Nenhuma tarefa concluída ainda.</p>";
  if (!temPerdidas) listaPerdidas.innerHTML += "<p>Nenhuma tarefa perdida.</p>";
  saldoElemento.textContent = "A receber: " + formatarReais(saldoDisponivelCentavos(tarefasAprovadas));
  tarefasAprovadasAtuais = tarefasAprovadas;
  renderizarRecebido();
});

const pagamentosQuery = query(collection(db, "pagamentos"), where("criancaId", "==", criancaId));
let pagamentosAtuais = [];
let tarefasAprovadasAtuais = [];

function formatarData(timestamp) {
  return timestamp ? timestamp.toDate().toLocaleDateString("pt-BR") : "—";
}

function textoPeriodo(pagamento) {
  if (!pagamento.periodoInicio || !pagamento.periodoFim) return "";
  return `, período ${formatarData(pagamento.periodoInicio)} a ${formatarData(pagamento.periodoFim)}`;
}

// Aba "Recebido": saldo atual (desde o último fechamento), último
// fechamento e histórico. Depende de tarefas e pagamentos, então é
// redesenhada quando qualquer um dos dois snapshots chega.
function renderizarRecebido() {
  const ultimoFechamento = pagamentosAtuais.find((pagamento) => pagamento.tipoPagamento === "fechamento");
  const aPagar = tarefasAprovadasAtuais.filter((tarefa) => !tarefa.pago);
  const desde = ultimoFechamento ? ` (desde o último fechamento em ${formatarData(ultimoFechamento.dataPagamento)})` : "";

  let html = "<h3>Recebido</h3>";
  html += `<div><h4>Saldo atual${desde}</h4>
    <p>${aPagar.length} tarefa(s) aprovada(s) aguardando pagamento</p>
    <p>Você vai receber: ${formatarReais(saldoDisponivelCentavos(tarefasAprovadasAtuais))}</p></div>`;

  if (ultimoFechamento) {
    html += `<div><h4>Último fechamento</h4>
      <p>${formatarReais(ultimoFechamento.valorCentavos)} pagos em ${formatarData(ultimoFechamento.dataPagamento)}${textoPeriodo(ultimoFechamento)}</p></div>`;
  }

  html += "<div><h4>Histórico de pagamentos</h4>";
  if (pagamentosAtuais.length === 0) {
    html += "<p>Nenhum pagamento registrado ainda.</p>";
  } else {
    pagamentosAtuais.forEach((pagamento) => {
      const rotulo = pagamento.tipoPagamento === "fechamento" ? "Fechamento de período" : "Pagamento";
      const qtd = (pagamento.tarefaIds || []).length;
      html += `<p>${formatarData(pagamento.dataPagamento)} — ${rotulo} — ${formatarReais(pagamento.valorCentavos)} — ${qtd} tarefa(s)${textoPeriodo(pagamento)}</p>`;
    });
  }
  html += "</div>";
  listaRecebido.innerHTML = html;
}

onSnapshot(pagamentosQuery, (snapshot) => {
  pagamentosAtuais = snapshot.docs
    .map((docSnap) => docSnap.data())
    .sort((a, b) => (b.dataPagamento?.toMillis() || 0) - (a.dataPagamento?.toMillis() || 0));
  renderizarRecebido();
});

// Aba "Chamados": acompanha cada chamado da criança até o avaliador decidir.
const chamadosQuery = query(collection(db, "chamados"), where("criancaId", "==", criancaId));
const nomesAutores = { anthony: "Anthony", gabriel: "Gabriel", pai: "Pai", avaliador: "Avaliador" };
const statusChamado = { aberto: "Aberto", aprovado: "Aprovado", negado: "Negado" };
const resultadoChamado = {
  aprovado: "Aprovado pelo avaliador — a tarefa foi concluída e o valor entrou no seu saldo.",
  negado: "Negado pelo avaliador. Não há novo recurso para essa tarefa.",
};
let cancelarMensagens = [];

function acompanharMensagens(container, chamadoId) {
  const mensagensQuery = query(collection(db, "chamados", chamadoId, "mensagens"), orderBy("data", "asc"));
  const cancelar = onSnapshot(mensagensQuery, (snapshot) => {
    container.innerHTML = snapshot.empty
      ? "<p>Nenhuma mensagem ainda.</p>"
      : snapshot.docs
          .map((docSnap) => {
            const mensagem = docSnap.data();
            const data = mensagem.data ? mensagem.data.toDate().toLocaleString("pt-BR") : "";
            return `<p><strong>${nomesAutores[mensagem.autor] || mensagem.autor}</strong> (${data}): ${mensagem.texto}</p>`;
          })
          .join("");
  });
  cancelarMensagens.push(cancelar);
}

async function enviarMensagemChamado(chamadoId, texto) {
  if (texto.trim() === "") return;
  try {
    await addDoc(collection(db, "chamados", chamadoId, "mensagens"), {
      autor: criancaId,
      texto: texto.trim(),
      data: serverTimestamp(),
    });
  } catch (erro) {
    console.error(erro);
    alert("Não foi possível enviar a mensagem. Tente novamente.");
  }
}

onSnapshot(chamadosQuery, (snapshot) => {
  // cada re-render recria os cards, então os listeners de mensagens antigos saem
  cancelarMensagens.forEach((cancelar) => cancelar());
  cancelarMensagens = [];
  listaChamados.innerHTML = "<h3>Chamados</h3>";

  if (snapshot.empty) {
    listaChamados.innerHTML += "<p>Nenhum chamado ainda.</p>";
    return;
  }

  const chamados = snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .sort((a, b) => (b.dataAbertura?.toMillis() || 0) - (a.dataAbertura?.toMillis() || 0));

  chamados.forEach((chamado) => {
    const aberto = chamado.status === "aberto";
    const item = document.createElement("div");
    item.innerHTML = `
      <h4>${chamado.nomeTarefa}</h4>
      <p>Valor: ${formatarReais(chamado.valorCentavos)}</p>
      <p>Status: ${statusChamado[chamado.status] || chamado.status}</p>
      <p>Aberto em ${formatarData(chamado.dataAbertura)}${chamado.dataResolucao ? " — resolvido em " + formatarData(chamado.dataResolucao) : ""}</p>
      <div class="chamado-mensagens"><p>Carregando mensagens...</p></div>
      ${aberto
        ? `<p>Aguardando decisão do avaliador.</p>
           <textarea class="chamado-texto" placeholder="Adicionar mensagem"></textarea>
           <button class="botao chamado-enviar">Enviar mensagem</button>`
        : `<p>${resultadoChamado[chamado.status] || ""}</p>`}
    `;
    acompanharMensagens(item.querySelector(".chamado-mensagens"), chamado.id);

    const btnEnviar = item.querySelector(".chamado-enviar");
    if (btnEnviar) {
      btnEnviar.addEventListener("click", () => {
        const campo = item.querySelector(".chamado-texto");
        enviarMensagemChamado(chamado.id, campo.value);
        campo.value = "";
      });
    }
    listaChamados.appendChild(item);
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
