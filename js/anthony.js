import { db, storage, collection, onSnapshot, query, where, doc, updateDoc, serverTimestamp, runTransaction, ref, uploadBytes, getDownloadURL } from "./firebase-config.js";

const listaFazer = document.getElementById("pfazer");
const listaConcluidas = document.getElementById("pconcluidas");
const listaBonus = document.getElementById("bonus");
const saldoElemento = document.querySelector(".saldo");
const tarefasQuery = query(collection(db, "tarefas"), where("criancaId", "==", "anthony"));

async function expirarSeVencida(tarefaId, tarefa) {
  if (tarefa.status != "disponivel") return;
  if (tarefa.prazo.toDate() < new Date()) {
    await updateDoc(doc(db, "tarefas", tarefaId), { status: "perdida", dataPerda: serverTimestamp() });
  }
}

onSnapshot(tarefasQuery, (snapshot) => {
  listaFazer.innerHTML = "<h3>Tarefas para fazer</h3>";
  listaConcluidas.innerHTML = "<h3>Concluídas</h3>";
  var temFazer = false;
  var temConcluidas = false;
  let saldoCentavos = 0;

  snapshot.forEach((docSnap) => {
    const tarefa = docSnap.data();
    const tarefaId = docSnap.id;
    expirarSeVencida(tarefaId, tarefa);
    const valorReais = (tarefa.valorCentavos / 100).toFixed(2);
    const item = document.createElement('div');

    if (tarefa.status === "disponivel") {
      const tentativasRestantes = 3 - (tarefa.tentativas || 0);
      let avisoRejeicao = "";
      if (tarefa.motivoRejeicao) avisoRejeicao = `<p class="motivo-rejeicao">Rejeitada: ${tarefa.motivoRejeicao}</p>`;

      item.innerHTML = `
        <h4>${tarefa.nome}</h4>
        <p>${tarefa.descricao}</p>
        <p>Valor: R$ ${valorReais}</p>
        <p>Tentativas restantes: ${tentativasRestantes}</p>
        ${avisoRejeicao}
        <textarea placeholder="Observação (opcional)" id="obs-${tarefaId}"></textarea>
        <input type="file" id="arquivo-${tarefaId}" accept="image/*,video/*">
        <button class="botao">Concluir tarefa</button>
      `;
      item.querySelector("button").addEventListener("click", function () {
        concluirTarefa(tarefaId, tarefa.tentativas || 0);
      });
      listaFazer.appendChild(item);
      temFazer = true;
    } else if (tarefa.status === "aprovada") {
      item.innerHTML = `
        <h4>${tarefa.nome}</h4>
        <p>${tarefa.descricao}</p>
        <p>Valor: R$ ${valorReais}</p>
        <p>${tarefa.pago ? "Pago" : "Aguardando pagamento"}</p>
      `;
      listaConcluidas.appendChild(item);
      temConcluidas = true;
      if (!tarefa.pago) {
        saldoCentavos = saldoCentavos + tarefa.valorCentavos;
      }
    }
  });

  if (!temFazer) listaFazer.innerHTML += "<p>Nenhuma tarefa ainda.</p>";
  if (!temConcluidas) listaConcluidas.innerHTML += "<p>Nenhuma tarefa concluída ainda.</p>";
  saldoElemento.textContent = "Saldo total: R$ " + (saldoCentavos / 100).toFixed(2);
});

async function concluirTarefa(tarefaId, tentativasAtuais) {
  const observacao = document.getElementById("obs-" + tarefaId).value;
  const arquivo = document.getElementById("arquivo-" + tarefaId).files[0];

  if (!arquivo) {
    alert("Anexe uma foto ou vídeo.");
    return;
  }

  const arquivoRef = ref(storage, "uploads/" + tarefaId + "-" + arquivo.name);
  await uploadBytes(arquivoRef, arquivo);
  const url = await getDownloadURL(arquivoRef);

  await updateDoc(doc(db, "tarefas", tarefaId), {
    status: "aguardando_aprovacao",
    observacaoCrianca: observacao,
    motivoRejeicao: "",
    tentativas: tentativasAtuais + 1,
    fotoUrl: url,
  });
}

const bonusQuery = query(collection(db, "tarefas"), where("tipoAtribuicao", "==", "bonus"), where("status", "==", "aberta"));

onSnapshot(bonusQuery, (snapshot) => {
  listaBonus.innerHTML = "<h3>Tarefas bônus disponíveis</h3>";

  if (snapshot.empty) {
    listaBonus.innerHTML += "<p>Nenhuma tarefa bônus agora.</p>";
    return;
  }

  snapshot.forEach((docSnap) => {
    const tarefa = docSnap.data();
    const tarefaId = docSnap.id;
    const valorReais = (tarefa.valorCentavos / 100).toFixed(2);

    const item = document.createElement("div");
    item.innerHTML = `
      <h4>${tarefa.nome}</h4>
      <p>${tarefa.descricao}</p>
      <p>Valor: R$ ${valorReais}</p>
      <button class="botao">Aceitar tarefa bônus</button>
    `;
    item.querySelector("button").addEventListener("click", () => aceitarBonus(tarefaId));
    listaBonus.appendChild(item);
  });
});

async function aceitarBonus(tarefaId) {
  const ref = doc(db, "tarefas", tarefaId);

  try {
    await runTransaction(db, async (transacao) => {
      const snap = await transacao.get(ref);
      const tarefa = snap.data();

      if (tarefa.status !== "aberta") {
        throw new Error("Essa tarefa já foi pega por outra pessoa.");
      }

      transacao.update(ref, {
        criancaId: "anthony",
        status: "disponivel",
        dataAceite: serverTimestamp()
      });
    });
  } catch (erro) {
    alert(erro.message);
  }
}