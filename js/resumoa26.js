import { db, collection, onSnapshot, query, where } from "./firebase-config.js";

const inputInicio = document.getElementById("periodo-inicio");
const inputFim = document.getElementById("periodo-fim");
const textoPeriodo = document.getElementById("periodo-texto");
const botaoMesAnterior = document.getElementById("botao-mes-anterior");

function primeiroDiaDoMes(data) {
  return new Date(data.getFullYear(), data.getMonth(), 1);
}

function ultimoDiaDoMes(data) {
  return new Date(data.getFullYear(), data.getMonth() + 1, 0);
}

function paraInputDate(data) {
  return data.toISOString().split("T")[0];
}

const hoje = new Date();
inputInicio.value = paraInputDate(primeiroDiaDoMes(hoje));
inputFim.value = paraInputDate(ultimoDiaDoMes(hoje));

const tarefasPorCrianca = {
  anthony: [],
  gabriel: []
};

function renderizarResumo(criancaId, elementoId, nomeExibido) {
  const elemento = document.getElementById(elementoId);
  const inicio = new Date(inputInicio.value + "T00:00:00");
  const fim = new Date(inputFim.value + "T23:59:59");

  let concluidas = 0;
  let perdidas = 0;
  let saldoCentavos = 0;
  let dinheiroGeradoCentavos = 0;
  let dinheiroPerdidoCentavos = 0;

  tarefasPorCrianca[criancaId].forEach((tarefa) => {
    if (tarefa.status === "aprovada") {
      if (!tarefa.pago) {
        saldoCentavos += tarefa.valorCentavos;
      }
      if (tarefa.dataAprovacao) {
        const dataAprovacao = tarefa.dataAprovacao.toDate();
        if (dataAprovacao >= inicio && dataAprovacao <= fim) {
          concluidas++;
          dinheiroGeradoCentavos += tarefa.valorCentavos;
        }
      }
    } else if (tarefa.status === "perdida") {
      if (tarefa.dataPerda) {
        const dataPerda = tarefa.dataPerda.toDate();
        if (dataPerda >= inicio && dataPerda <= fim) {
          perdidas++;
          dinheiroPerdidoCentavos += tarefa.valorCentavos;
        }
      }
    }
  });

  elemento.innerHTML = `
    <h2>${nomeExibido}</h2>
    <p>Concluídas no período: ${concluidas}</p>
    <p>Perdidas no período: ${perdidas}</p>
    <p>Dinheiro gerado no período: R$ ${(dinheiroGeradoCentavos / 100).toFixed(2)}</p>
    <p>Dinheiro perdido no período: R$ ${(dinheiroPerdidoCentavos / 100).toFixed(2)}</p>
    <p>Saldo disponível (total, não filtrado): R$ ${(saldoCentavos / 100).toFixed(2)}</p>
  `;
}

function atualizarTextoPeriodo() {
  const inicio = new Date(inputInicio.value + "T00:00:00");
  const fim = new Date(inputFim.value + "T00:00:00");
  textoPeriodo.textContent = `Período: ${inicio.toLocaleDateString("pt-BR")} até ${fim.toLocaleDateString("pt-BR")}`;
}

function renderizarTudo() {
  atualizarTextoPeriodo();
  renderizarResumo("anthony", "resumo-anthony", "Anthony");
  renderizarResumo("gabriel", "resumo-gabriel", "Gabriel");
}

function validarPeriodo() {
  const inicio = new Date(inputInicio.value);
  const fim = new Date(inputFim.value);

  if (fim < inicio) {
    alert("A data final não pode ser antes da data inicial.");
    return false;
  }
  return true;
}

inputInicio.addEventListener("change", () => {
  if (validarPeriodo()) renderizarTudo();
});

inputFim.addEventListener("change", () => {
  if (validarPeriodo()) renderizarTudo();
});

botaoMesAnterior.addEventListener("click", () => {
  const dataAtual = new Date(inputInicio.value + "T00:00:00");
  const mesAnterior = new Date(dataAtual.getFullYear(), dataAtual.getMonth() - 1, 1);
  inputInicio.value = paraInputDate(primeiroDiaDoMes(mesAnterior));
  inputFim.value = paraInputDate(ultimoDiaDoMes(mesAnterior));
  renderizarTudo();
});

function escutarCrianca(criancaId) {
  const tarefasQuery = query(collection(db, "tarefas"), where("criancaId", "==", criancaId));

  onSnapshot(tarefasQuery, (snapshot) => {
    tarefasPorCrianca[criancaId] = snapshot.docs.map((docSnap) => docSnap.data());
    renderizarTudo();
  });
}

escutarCrianca("anthony");
escutarCrianca("gabriel");
renderizarTudo();