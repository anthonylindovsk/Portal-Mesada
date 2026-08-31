import { db, collection, addDoc, Timestamp, onSnapshot, query, orderBy, where, doc, updateDoc, serverTimestamp } from "./firebase-config.js";

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
  if (tarefa.status != "disponivel") return;
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

async function marcarComoPago(tarefaId) {
  await updateDoc(doc(db, "tarefas", tarefaId), {
    pago: true,
    dataPagamento: serverTimestamp()
  });
}

const listaTarefas = document.getElementById("lista-tarefas");
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
    const valorReais = (tarefa.valorCentavos / 100).toFixed(2);
    const quem = tarefa.criancaId ? tarefa.criancaId : "Bônus — disputa aberta";
    const botaoReabrir = tarefa.status === "perdida" ? `<button class="botao botao-reabrir">Reabrir</button>` : "";
    const botaoCancelar = tarefa.status === "disponivel" ? `<button class="botao botao-cancelar">Cancelar</button>` : "";
    const botaoPagar = (tarefa.status === "aprovada" && !tarefa.pago) ? `<button class="botao botao-pagar">Marcar como pago</button>` : "";
    const infoPagamento = tarefa.status === "aprovada" ? `<p>Pago: ${tarefa.pago ? "sim" : "não"}</p>` : "";

    const item = document.createElement("div");
    item.innerHTML = `
      <h3>${tarefa.nome}</h3>
      <p>${tarefa.descricao}</p>
      <p>Valor: R$ ${valorReais}</p>
      <p>Para: ${quem}</p>
      <p>Status: ${tarefa.status}</p>
      ${infoPagamento}
      ${botaoReabrir}
      ${botaoCancelar}
      ${botaoPagar}
    `;
    const btnReabrir = item.querySelector(".botao-reabrir");
    if (btnReabrir) btnReabrir.addEventListener("click", () => reabrirTarefa(tarefaId));
    const btnCancelar = item.querySelector(".botao-cancelar");
    if (btnCancelar) btnCancelar.addEventListener("click", () => cancelarTarefa(tarefaId));
    const btnPagar = item.querySelector(".botao-pagar");
    if (btnPagar) btnPagar.addEventListener("click", () => marcarComoPago(tarefaId));
    listaTarefas.appendChild(item);
  });
});

const listaPendentes = document.getElementById("lista-pendentes");
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
    const valorReais = (tarefa.valorCentavos / 100).toFixed(2);
    const tentativas = tarefa.tentativas || 0;
    const avisoUltima = tentativas >= 3 ? `<p class="avisottv">Última tentativa: rejeitar agora marca como perdida</p>` : "";

    const item = document.createElement("div");
    item.innerHTML = `
      <h3>${tarefa.nome}</h3>
      <p>Valor: R$ ${valorReais}</p>
      <p>Tentativa: ${tentativas} de 3</p>
      ${avisoUltima}
      <p>Observação: ${tarefa.observacaoCrianca || "(nenhuma)"}</p>
      <a href="${tarefa.fotoUrl}" target="_blank">Ver comprovante</a>
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
  const ref = doc(db, "tarefas", tarefaId);
  if (tentativasAtuais >= 3) {
    await updateDoc(ref, { status: "perdida", motivoRejeicao: motivo.trim(), observacaoCrianca: "", dataPerda: serverTimestamp() });
  } else {
    await updateDoc(ref, { status: "disponivel", motivoRejeicao: motivo.trim(), observacaoCrianca: "" });
  }
}