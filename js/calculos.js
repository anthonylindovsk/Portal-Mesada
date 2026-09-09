// Funções financeiras puras (RN05, RN06, RN07, RN10). Sem acesso a DOM ou Firestore.

export function saldoDisponivelCentavos(tarefas) {
  return tarefas
    .filter((tarefa) => tarefa.status === "aprovada" && !tarefa.pago)
    .reduce((soma, tarefa) => soma + tarefa.valorCentavos, 0);
}

export function tarefasAprovadasNoPeriodo(tarefas, inicio, fim) {
  return tarefas
    .filter((tarefa) => tarefa.status === "aprovada" && tarefa.dataAprovacao)
    .filter((tarefa) => {
      const data = tarefa.dataAprovacao.toDate();
      return data >= inicio && data <= fim;
    });
}

export function dinheiroGeradoCentavos(tarefas, inicio, fim) {
  return tarefasAprovadasNoPeriodo(tarefas, inicio, fim).reduce((soma, tarefa) => soma + tarefa.valorCentavos, 0);
}

export function dinheiroPerdidoCentavos(tarefas, inicio, fim) {
  return tarefas
    .filter((tarefa) => tarefa.status === "perdida" && tarefa.dataPerda)
    .filter((tarefa) => {
      const data = tarefa.dataPerda.toDate();
      return data >= inicio && data <= fim;
    })
    .reduce((soma, tarefa) => soma + tarefa.valorCentavos, 0);
}

export function tarefasPerdidasNoPeriodo(tarefas, inicio, fim) {
  return tarefas
    .filter((tarefa) => tarefa.status === "perdida" && tarefa.dataPerda)
    .filter((tarefa) => {
      const data = tarefa.dataPerda.toDate();
      return data >= inicio && data <= fim;
    })
    .sort((a, b) => b.dataPerda.toDate() - a.dataPerda.toDate());
}

export function formatarReais(centavos) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);
}
