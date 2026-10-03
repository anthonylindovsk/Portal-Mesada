import { db, collection, addDoc, onSnapshot, query, where, orderBy, doc, serverTimestamp, writeBatch } from "./firebase-config.js";
import { formatarReais } from "./calculos.js";

const perfilAtivo = sessionStorage.getItem("perfilAtivo");
const ehAvaliador = perfilAtivo === "avaliador";
const nomesExibidos = { anthony: "Anthony", gabriel: "Gabriel" };
const statusTextos = { aberto: "Aberto", aprovado: "Aprovado", negado: "Negado" };

const listaAbertos = document.getElementById("chamadosAbertos");
const listaResolvidos = document.getElementById("chamadosResolvidos");

function renderizarMensagens(container, chamadoId) {
  const mensagensQuery = query(collection(db, "chamados", chamadoId, "mensagens"), orderBy("data", "asc"));
  onSnapshot(mensagensQuery, (snapshot) => {
    container.innerHTML = snapshot.empty
      ? "<p>Nenhuma mensagem ainda.</p>"
      : snapshot.docs
          .map((docSnap) => {
            const mensagem = docSnap.data();
            const data = mensagem.data ? mensagem.data.toDate().toLocaleString("pt-BR") : "";
            return `<p><strong>${mensagem.autor}</strong> (${data}): ${mensagem.texto}</p>`;
          })
          .join("");
  });
}

async function enviarMensagem(chamadoId, texto) {
  if (!texto || texto.trim() === "") return;
  await addDoc(collection(db, "chamados", chamadoId, "mensagens"), {
    autor: perfilAtivo,
    texto: texto.trim(),
    data: serverTimestamp(),
  });
}

async function resolverChamado(chamado, decisao) {
  const veredito = decisao === "aprovado" ? "aprovar" : "negar";
  if (!confirm(`Tem certeza que quer ${veredito} a tarefa "${chamado.nomeTarefa}"?`)) return;

  const lote = writeBatch(db);
  lote.update(doc(db, "chamados", chamado.id), { status: decisao, dataResolucao: serverTimestamp() });

  // chamadoId fica gravado de propósito: é ele que impede a criança de abrir
  // um 2º chamado para a mesma tarefa (só o pai reabrindo a tarefa o limpa).
  if (decisao === "aprovado") {
    lote.update(doc(db, "tarefas", chamado.tarefaId), {
      status: "aprovada",
      dataAprovacao: serverTimestamp(),
    });
  } else {
    lote.update(doc(db, "tarefas", chamado.tarefaId), {
      status: "perdida",
      dataPerda: serverTimestamp(),
    });
  }

  await lote.commit();
}

function montarCard(chamado, resolvido) {
  const item = document.createElement("div");
  const nomeCrianca = nomesExibidos[chamado.criancaId] || chamado.criancaId;

  const areaMensagem = !resolvido
    ? `<textarea placeholder="Adicionar mensagem" class="chamado-texto"></textarea><button class="botao chamado-enviar">Enviar mensagem</button>`
    : "";
  const botoesAvaliador = !resolvido && ehAvaliador
    ? `<button class="botao chamado-aprovar">Aprovar tarefa</button><button class="botao chamado-negar">Negar tarefa</button>`
    : "";

  item.innerHTML = `
    <h3>${chamado.nomeTarefa}</h3>
    <p>Criança: ${nomeCrianca}</p>
    <p>Valor: ${formatarReais(chamado.valorCentavos)}</p>
    <p>Status: ${statusTextos[chamado.status] || chamado.status}</p>
    <div class="chamado-mensagens"><p>Carregando mensagens...</p></div>
    ${areaMensagem}
    ${botoesAvaliador}
  `;

  renderizarMensagens(item.querySelector(".chamado-mensagens"), chamado.id);

  const btnEnviar = item.querySelector(".chamado-enviar");
  if (btnEnviar) {
    btnEnviar.addEventListener("click", () => {
      const campo = item.querySelector(".chamado-texto");
      enviarMensagem(chamado.id, campo.value);
      campo.value = "";
    });
  }

  const btnAprovar = item.querySelector(".chamado-aprovar");
  if (btnAprovar) btnAprovar.addEventListener("click", () => resolverChamado(chamado, "aprovado"));

  const btnNegar = item.querySelector(".chamado-negar");
  if (btnNegar) btnNegar.addEventListener("click", () => resolverChamado(chamado, "negado"));

  return item;
}

const abertosQuery = query(collection(db, "chamados"), where("status", "==", "aberto"));
onSnapshot(abertosQuery, (snapshot) => {
  listaAbertos.innerHTML = "";
  if (snapshot.empty) {
    listaAbertos.innerHTML = "<p>Nenhum chamado em aberto.</p>";
    return;
  }
  snapshot.forEach((docSnap) => {
    const chamado = { id: docSnap.id, ...docSnap.data() };
    listaAbertos.appendChild(montarCard(chamado, false));
  });
});

const resolvidosQuery = query(collection(db, "chamados"), where("status", "in", ["aprovado", "negado"]));
onSnapshot(resolvidosQuery, (snapshot) => {
  listaResolvidos.innerHTML = "";
  if (snapshot.empty) {
    listaResolvidos.innerHTML = "<p>Nenhum chamado resolvido ainda.</p>";
    return;
  }
  snapshot.forEach((docSnap) => {
    const chamado = { id: docSnap.id, ...docSnap.data() };
    listaResolvidos.appendChild(montarCard(chamado, true));
  });
});
