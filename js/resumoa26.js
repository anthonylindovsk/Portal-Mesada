import { db, collection, onSnapshot, query, where, doc, writeBatch, serverTimestamp, Timestamp } from "./firebase-config.js";
import {
  saldoDisponivelCentavos,
  tarefasAPagarNoPeriodo,
  somaCentavos,
  dinheiroGeradoCentavos,
  dinheiroPerdidoCentavos,
  tarefasAprovadasNoPeriodo,
  tarefasPerdidasNoPeriodo,
  formatarReais,
} from "./calculos.js";

const inputInicio = document.getElementById("melancia8");
const inputFim = document.getElementById("kiwi9");
const textoPeriodo = document.getElementById("coco10");
const botaoMesAnterior = document.getElementById("pessego11");

const nomesExibidos = { anthony: "Anthony", gabriel: "Gabriel" };
const criancas = ["anthony", "gabriel"];
const elementoPorCrianca = { anthony: "maca12", gabriel: "pitaya13" };

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

const tarefasPorCrianca = { anthony: [], gabriel: [] };
const pagamentosPorCrianca = { anthony: [], gabriel: [] };
// ids desmarcados pelo pai; fica fora do HTML para o onSnapshot não resetar os checkboxes
const desmarcadasPorCrianca = { anthony: new Set(), gabriel: new Set() };

function renderizarResumo(criancaId) {
  const elemento = document.getElementById(elementoPorCrianca[criancaId]);
  const inicio = new Date(inputInicio.value + "T00:00:00");
  const fim = new Date(inputFim.value + "T23:59:59");
  const tarefas = tarefasPorCrianca[criancaId];
  const pagamentos = pagamentosPorCrianca[criancaId];

  const concluidas = tarefasAprovadasNoPeriodo(tarefas, inicio, fim).length;
  const perdidas = tarefasPerdidasNoPeriodo(tarefas, inicio, fim);
  const dinheiroGeradoCentavosValor = dinheiroGeradoCentavos(tarefas, inicio, fim);
  const dinheiroPerdidoCentavosValor = dinheiroPerdidoCentavos(tarefas, inicio, fim);
  const saldoCentavos = saldoDisponivelCentavos(tarefas);
  const totalPagoCentavos = pagamentos.reduce((soma, pagamento) => soma + pagamento.valorCentavos, 0);

  const linhasPerdidas = perdidas.length
    ? perdidas
        .map((tarefa) => `<p>${tarefa.nome} — ${formatarReais(tarefa.valorCentavos)} — perdida em ${tarefa.dataPerda.toDate().toLocaleDateString("pt-BR")}</p>`)
        .join("")
    : "<p>Nenhuma atividade perdida no período.</p>";

  const linhasPagamentos = pagamentos.length
    ? pagamentos
        .map((pagamento, indice) => {
          const data = pagamento.dataPagamento ? pagamento.dataPagamento.toDate().toLocaleDateString("pt-BR") : "—";
          return `
            <details>
              <summary>${data} — ${formatarReais(pagamento.valorCentavos)}</summary>
              <p>${(pagamento.tarefaIds || []).length} tarefa(s) liquidada(s)${pagamento.periodoInicio && pagamento.periodoFim ? " — período " + pagamento.periodoInicio.toDate().toLocaleDateString("pt-BR") + " a " + pagamento.periodoFim.toDate().toLocaleDateString("pt-BR") : ""}</p>
            </details>
          `;
        })
        .join("")
    : "<p>Nenhum pagamento registrado ainda.</p>";

  const aPagar = tarefasAPagarNoPeriodo(tarefas, inicio, fim);
  const marcadas = aPagar.filter((tarefa) => !desmarcadasPorCrianca[criancaId].has(tarefa.id));
  const totalMarcadasCentavos = somaCentavos(marcadas);
  const foraDoPeriodo = tarefas.filter((tarefa) => tarefa.status === "aprovada" && !tarefa.pago && !aPagar.includes(tarefa));

  const linhasAPagar = aPagar.length
    ? aPagar
        .map((tarefa) => `
          <label>
            <input type="checkbox" class="marcar-tarefa" data-id="${tarefa.id}" ${desmarcadasPorCrianca[criancaId].has(tarefa.id) ? "" : "checked"}>
            ${tarefa.nome} — ${formatarReais(tarefa.valorCentavos)} — aprovada em ${tarefa.dataAprovacao.toDate().toLocaleDateString("pt-BR")}
          </label><br>`)
        .join("")
    : "<p>Nenhuma tarefa aprovada a pagar neste período.</p>";

  const avisoForaDoPeriodo = foraDoPeriodo.length
    ? `<p>Aprovadas e não pagas fora do período: ${foraDoPeriodo.length} (${formatarReais(somaCentavos(foraDoPeriodo))}) — ficam pendentes para outro período.</p>`
    : "";

  const botaoPagamento = marcadas.length > 0
    ? `<button class="botao pagar-periodo">Pagar período (${marcadas.length} tarefa(s) — ${formatarReais(totalMarcadasCentavos)})</button>`
    : "";

  elemento.innerHTML = `
    <h2>${nomesExibidos[criancaId]}</h2>
    <p>Concluídas no período: ${concluidas}</p>
    <p>Perdidas no período: ${perdidas.length}</p>
    <p>Dinheiro gerado no período: ${formatarReais(dinheiroGeradoCentavosValor)}</p>
    <p>Dinheiro perdido no período: ${formatarReais(dinheiroPerdidoCentavosValor)}</p>
    <p>Saldo disponível (total, não filtrado): ${formatarReais(saldoCentavos)}</p>
    <div>
      <h4>Fechamento do período — aprovadas a pagar: ${aPagar.length} (${formatarReais(somaCentavos(aPagar))})</h4>
      ${linhasAPagar}
      ${avisoForaDoPeriodo}
      ${botaoPagamento}
    </div>
    <div><h4>Atividades perdidas no período</h4>${linhasPerdidas}</div>
    <div><h4>Histórico de pagamentos</h4><p>Total pago (todo o período): ${formatarReais(totalPagoCentavos)}</p>${linhasPagamentos}</div>
  `;

  elemento.querySelectorAll(".marcar-tarefa").forEach((caixa) => {
    caixa.addEventListener("change", () => {
      if (caixa.checked) desmarcadasPorCrianca[criancaId].delete(caixa.dataset.id);
      else desmarcadasPorCrianca[criancaId].add(caixa.dataset.id);
      renderizarResumo(criancaId);
    });
  });

  const botao = elemento.querySelector(".pagar-periodo");
  if (botao) botao.addEventListener("click", () => pagarPeriodo(criancaId));
}

async function pagarPeriodo(criancaId) {
  const inicio = new Date(inputInicio.value + "T00:00:00");
  const fim = new Date(inputFim.value + "T23:59:59");
  const tarefasAPagar = tarefasAPagarNoPeriodo(tarefasPorCrianca[criancaId], inicio, fim)
    .filter((tarefa) => !desmarcadasPorCrianca[criancaId].has(tarefa.id));
  if (tarefasAPagar.length === 0) {
    alert("Não há tarefas marcadas para pagar neste período.");
    return;
  }

  const valorTotal = somaCentavos(tarefasAPagar);
  const listaNomes = tarefasAPagar.map((tarefa) => `- ${tarefa.nome} (${formatarReais(tarefa.valorCentavos)})`).join("\n");
  const confirmado = confirm(
    `Fechar o período ${inicio.toLocaleDateString("pt-BR")} a ${fim.toLocaleDateString("pt-BR")} e pagar ${formatarReais(valorTotal)} para ${nomesExibidos[criancaId]}?\n\n${listaNomes}\n\nEssa ação não pode ser desfeita.`
  );
  if (!confirmado) return;

  const pagamentoRef = doc(collection(db, "pagamentos"));
  const lote = writeBatch(db);
  lote.set(pagamentoRef, {
    criancaId,
    valorCentavos: valorTotal,
    dataPagamento: serverTimestamp(),
    tarefaIds: tarefasAPagar.map((tarefa) => tarefa.id),
    observacao: "Fechamento de período",
    tipoPagamento: "fechamento",
    periodoInicio: Timestamp.fromDate(inicio),
    periodoFim: Timestamp.fromDate(fim),
  });
  tarefasAPagar.forEach((tarefa) => {
    lote.update(doc(db, "tarefas", tarefa.id), { pago: true, pagamentoId: pagamentoRef.id });
  });
  await lote.commit();
}

function atualizarTextoPeriodo() {
  const inicio = new Date(inputInicio.value + "T00:00:00");
  const fim = new Date(inputFim.value + "T00:00:00");
  textoPeriodo.textContent = `Período: ${inicio.toLocaleDateString("pt-BR")} até ${fim.toLocaleDateString("pt-BR")}`;
}

function renderizarTudo() {
  atualizarTextoPeriodo();
  criancas.forEach(renderizarResumo);
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
    tarefasPorCrianca[criancaId] = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    renderizarTudo();
  });

  const pagamentosQuery = query(collection(db, "pagamentos"), where("criancaId", "==", criancaId));
  onSnapshot(pagamentosQuery, (snapshot) => {
    pagamentosPorCrianca[criancaId] = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .sort((a, b) => (b.dataPagamento?.toMillis() || 0) - (a.dataPagamento?.toMillis() || 0));
    renderizarTudo();
  });
}

criancas.forEach(escutarCrianca);
renderizarTudo();
