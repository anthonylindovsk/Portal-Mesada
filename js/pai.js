import { db, storage, collection, addDoc, Timestamp, onSnapshot, query, orderBy, where, doc, updateDoc, deleteDoc, serverTimestamp, ref, deleteObject, listAll } from "./firebase-config.js";
import { formatarReais } from "./calculos.js";

async function apagarAnexos(tarefaId) {
  const pasta = ref(storage, "tarefas/" + tarefaId + "/anexos");
  const lista = await listAll(pasta).catch(() => null);
  if (!lista) return;
  await Promise.all(lista.items.map((item) => deleteObject(item).catch(() => {})));
}

function htmlAnexos(tarefa) {
  const anexos = tarefa.anexos && tarefa.anexos.length > 0
    ? tarefa.anexos
    : (tarefa.fotoUrl ? [{ url: tarefa.fotoUrl, tipo: "imagem" }] : []);

  if (anexos.length === 0) return "<p>Sem anexo.</p>";

  return anexos.map((anexo, indice) => {
    const rotulo = anexo.tipo === "video" ? "Ver vídeo" : "Ver foto";
    return `<p><a href="${anexo.url}" target="_blank">${rotulo} ${indice + 1}</a></p>`;
  }).join("");
}

const formularioTarefa = document.getElementById("tarefa");
const nomeTarefa = document.getElementById("nome");
const descricaoTarefa = document.getElementById("descricao");
const valorTarefa = document.getElementById("valor");
const destinatarioTarefa = document.getElementById("destinatario");
const prazoTarefa = document.getElementById("prazo");

function pad(n) {
  return String(n).padStart(2, "0");
}

function paraDatetimeLocal(data) {
  return data.getFullYear() + "-" + pad(data.getMonth() + 1) + "-" + pad(data.getDate()) + "T" + pad(data.getHours()) + ":" + pad(data.getMinutes());
}

const prazoPadrao = new Date();
prazoPadrao.setDate(prazoPadrao.getDate() + 3);
prazoTarefa.value = paraDatetimeLocal(prazoPadrao);

formularioTarefa.addEventListener("submit", async function (evento) {
  evento.preventDefault();

  if (new Date(prazoTarefa.value) < new Date()) {
    alert("O prazo precisa ser no futuro.");
    return;
  }

  const valorEmCentavos = Math.round(Number(valorTarefa.value) * 100);
  const destinatario = destinatarioTarefa.value;
  const ehBonus = destinatario === "bonus";

  try {
    const docRef = await addDoc(collection(db, "tarefas"), {
      nome: nomeTarefa.value,
      descricao: descricaoTarefa.value,
      valorCentavos: valorEmCentavos,
      tipoAtribuicao: ehBonus ? "bonus" : "fixa",
      criancaId: ehBonus ? null : destinatario,
      prazo: Timestamp.fromDate(new Date(prazoTarefa.value)),
      status: ehBonus ? "aberta" : "disponivel",
      tentativas: 0,
      pago: false,
      dataCriacao: serverTimestamp(),
    });
    console.log("tarefa criada: " + docRef.id);
    formularioTarefa.reset();
    const novoPadrao = new Date();
    novoPadrao.setDate(novoPadrao.getDate() + 3);
    prazoTarefa.value = paraDatetimeLocal(novoPadrao);
  } catch (erro) {
    console.log("deu erro ao gravar", erro);
  }
});

async function expirarSeVencida(tarefaId, tarefa) {
  if (tarefa.status !== "disponivel" && tarefa.status !== "aberta") return;
  if (tarefa.prazo.toDate() < new Date()) {
    await updateDoc(doc(db, "tarefas", tarefaId), { status: "perdida", dataPerda: serverTimestamp() });
  }
}

async function reabrirTarefa(tarefaId) {
  const dias = prompt("Em quantos dias a partir de agora vence essa tarefa reaberta?");
  if (dias === null) return;
  const diasNumero = Number(dias);
  if (!diasNumero || diasNumero <= 0) {
    alert("Informe um número de dias válido, maior que zero.");
    return;
  }
  const novoPrazo = new Date();
  novoPrazo.setDate(novoPrazo.getDate() + diasNumero);
  await updateDoc(doc(db, "tarefas", tarefaId), {
    status: "disponivel",
    prazo: Timestamp.fromDate(novoPrazo),
    dataPerda: null,
    tentativas: 0,
  });
}

async function cancelarTarefa(tarefaId) {
  if (!confirm("Tem certeza que quer cancelar essa tarefa? Ela vai virar perdida.")) return;
  await updateDoc(doc(db, "tarefas", tarefaId), { status: "perdida", dataPerda: serverTimestamp() });
}

async function excluirTarefa(tarefaId, tarefa) {
  if (tarefa.pago) {
    alert("Tarefa já paga não pode ser excluída, para preservar o histórico financeiro.");
    return;
  }
  if (!confirm("Tem certeza que quer excluir essa tarefa? Essa ação não pode ser desfeita.")) return;
  await apagarAnexos(tarefaId);
  if (tarefa.fotoUrl) {
    await deleteObject(ref(storage, "tarefas/" + tarefaId + "/comprovante.jpg")).catch(() => {});
  }
  await deleteDoc(doc(db, "tarefas", tarefaId));
}

const listaTarefas = document.getElementById("morango2");
const tarefasQuery = query(collection(db, "tarefas"), orderBy("dataCriacao", "desc"));

onSnapshot(tarefasQuery, (snapshot) => {
  listaTarefas.innerHTML = "";
  if (snapshot.empty) {
    listaTarefas.innerHTML = "<p>Nenhuma tarefa criada ainda.</p>";
    return;
  }

  snapshot.forEach((docSnap) => {
    const tarefa = docSnap.data();
    const tarefaId = docSnap.id;
    expirarSeVencida(tarefaId, tarefa);
    const valorReais = formatarReais(tarefa.valorCentavos);
    const quem = tarefa.criancaId ? tarefa.criancaId : "Bônus — disputa aberta";
    const botaoReabrir = tarefa.status === "perdida" ? `<button class="botao uva3">Reabrir</button>` : "";
    const botaoCancelar = tarefa.status === "disponivel" ? `<button class="botao pera4">Cancelar</button>` : "";
    const botaoExcluir = ((tarefa.status === "aprovada" || tarefa.status === "perdida") && !tarefa.pago) ? `<button class="botao abacaxi6">×</button>` : "";
    const infoPagamento = tarefa.status === "aprovada" ? `<p>Pago: ${tarefa.pago ? "sim" : "não"}</p>` : "";

    const item = document.createElement("div");
    item.innerHTML = `
      <h3>${tarefa.nome}</h3>
      <p>${tarefa.descricao}</p>
      <p>Valor: ${valorReais}</p>
      <p>Para: ${quem}</p>
      <p>Status: ${tarefa.status}</p>
      ${infoPagamento}
      ${botaoReabrir}
      ${botaoCancelar}
      ${botaoExcluir}
    `;
    const btnReabrir = item.querySelector(".uva3");
    if (btnReabrir) btnReabrir.addEventListener("click", () => reabrirTarefa(tarefaId));
    const btnCancelar = item.querySelector(".pera4");
    if (btnCancelar) btnCancelar.addEventListener("click", () => cancelarTarefa(tarefaId));
    const btnExcluir = item.querySelector(".abacaxi6");
    if (btnExcluir) btnExcluir.addEventListener("click", () => excluirTarefa(tarefaId, tarefa));
    listaTarefas.appendChild(item);
  });
});

const listaPendentes = document.getElementById("banana1");
const pendentesQuery = query(collection(db, "tarefas"), where("status", "==", "aguardando_aprovacao"));

onSnapshot(pendentesQuery, (snapshot) => {
  listaPendentes.innerHTML = "";
  if (snapshot.empty) {
    listaPendentes.innerHTML = "<p>Nada pendente.</p>";
    return;
  }

  snapshot.forEach((docSnap) => {
    const tarefa = docSnap.data();
    const tarefaId = docSnap.id;
    const valorReais = formatarReais(tarefa.valorCentavos);
    const tentativas = tarefa.tentativas || 0;
    const avisoUltima = tentativas >= 3 ? `<p class="avisottv">Última tentativa: rejeitar agora marca como perdida</p>` : "";

    const item = document.createElement("div");
    item.innerHTML = `
      <h3>${tarefa.nome}</h3>
      <p>Valor: ${valorReais}</p>
      <p>Tentativa: ${tentativas} de 3</p>
      ${avisoUltima}
      <p>Observação: ${tarefa.observacaoCrianca || "(nenhuma)"}</p>
      ${htmlAnexos(tarefa)}
      <button class="botao">Aprovar</button>
      <button class="botao">Rejeitar</button>
    `;
    const botoes = item.querySelectorAll("button");
    botoes[0].addEventListener("click", () => aprovarTarefa(tarefaId));
    botoes[1].addEventListener("click", () => rejeitarTarefa(tarefaId, tentativas));
    listaPendentes.appendChild(item);
  });
});

async function aprovarTarefa(tarefaId) {
  await updateDoc(doc(db, "tarefas", tarefaId), { status: "aprovada", dataAprovacao: serverTimestamp() });
}

async function rejeitarTarefa(tarefaId, tentativasAtuais) {
  const motivo = prompt("Por que está rejeitando essa tarefa?");
  if (motivo === null) return;
  if (motivo.trim() === "") {
    alert("É necessário informar um motivo para rejeitar a tarefa.");
    return;
  }
  const tarefaRef = doc(db, "tarefas", tarefaId);
  await apagarAnexos(tarefaId);
  await deleteObject(ref(storage, "tarefas/" + tarefaId + "/comprovante.jpg")).catch(() => {});
  const camposComuns = { motivoRejeicao: motivo.trim(), observacaoCrianca: "", anexos: [], fotoUrl: "" };
  if (tentativasAtuais >= 3) {
    await updateDoc(tarefaRef, { ...camposComuns, status: "perdida", dataPerda: serverTimestamp() });
  } else {
    await updateDoc(tarefaRef, { ...camposComuns, status: "disponivel" });
  }
}

async function zerarPin(perfilId) {
  if (!confirm(`Zerar o PIN de ${perfilId}? Na próxima entrada, um novo PIN será definido.`)) return;
  await updateDoc(doc(db, "perfis", perfilId), { pinDefinido: false, pinHash: null });
  alert("PIN zerado.");
}

document.getElementById("resetarPinAnthony").addEventListener("click", () => zerarPin("anthony"));
document.getElementById("resetarPinGabriel").addEventListener("click", () => zerarPin("gabriel"));