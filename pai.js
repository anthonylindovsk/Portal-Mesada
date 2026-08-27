import { db, collection, addDoc, Timestamp } from "./firebase-config.js";

const formularioTarefa = document.getElementById("tarefa");
const nomeTarefa = document.getElementById("nome");
const descricaoTarefa = document.getElementById("descricao");
const valorTarefa = document.getElementById("valor");
const prazoTarefa = document.getElementById("prazo");

formularioTarefa.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  console.log(`Nome tarefa: ${nomeTarefa.value}`);
  console.log(`Descrição tarefa: ${descricaoTarefa.value}`);
  console.log(`Valor tarefa: ${valorTarefa.value}`);
  console.log(`Prazo tarefa: ${prazoTarefa.value}`);

  try {
    const docRef = await addDoc(collection(db, "tarefas"), {
      nome: nomeTarefa.value,
      descricao: descricaoTarefa.value,
      valorCentavos: Number(valorTarefa.value),
      prazo: Timestamp.fromDate(new Date(prazoTarefa.value)),
    });

    console.log(`Tarefa incluida com sucesso: ${docRef.id}`);
  } catch (erro) {
    console.error(`Erro ao gravar:`, erro);
  }
});