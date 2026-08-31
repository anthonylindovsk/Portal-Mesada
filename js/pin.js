import { db } from "./firebase-config.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let perfilId, destino;

async function abrirModal(id, pagina) {
  perfilId = id;
  destino = pagina;
  document.getElementById("erroPin").textContent = "";
  document.getElementById("inputPin").value = "";
  document.getElementById("Confirma").value = "";
  const snap = await getDoc(doc(db, "perfis", id));
  const primeiraVez = !snap.data().pinDefinido;
  document.getElementById("grupoConfirma").style.display = primeiraVez ? "block" : "none";
  document.getElementById("modalLogin").classList.remove("tirar");
}

function fecharModal() {
  document.getElementById("modalLogin").classList.add("tirar");
}

async function confirmarPin() {
  const pin = document.getElementById("inputPin").value;
  const confirma = document.getElementById("Confirma").value;
  const erro = document.getElementById("erroPin");

  if (!/^\d{4}$/.test(pin)) {
    erro.textContent = "PIN precisa ter 4 números.";
    return;
  }

  const ref = doc(db, "perfis", perfilId);
  const perfil = (await getDoc(ref)).data();

  if (!perfil.pinDefinido) {
    if (pin !== confirma) {
      erro.textContent = "Os PINs não batem.";
      return;
    }
    await updateDoc(ref, { pin: pin, pinDefinido: true });
    sessionStorage.setItem("perfilAtivo", perfilId);
    location.href = destino;
    return;
  }

  if (pin === perfil.pin) {
    sessionStorage.setItem("perfilAtivo", perfilId);
    location.href = destino;
  } else {
    erro.textContent = "PIN incorreto.";
  }
}

window.abrirModal = abrirModal;
window.fecharModal = fecharModal;
window.confirmarPin = confirmarPin;