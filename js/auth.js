import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { app } from "./firebase-config.js";

const auth = getAuth(app);

function mostrarErroAuth(mensagem) {
  const elemento = document.getElementById("erro-auth");
  if (elemento) elemento.textContent = mensagem;
}

signInAnonymously(auth)
  .then(() => {
  })
  .catch((error) => {
    console.error(error.code, error.message);
    mostrarErroAuth("Não foi possível conectar. Verifique sua internet e recarregue a página.");
  });

onAuthStateChanged(auth, (user) => {
  if (user) {
    const uid = user.uid;
    console.log("uid ativo:", uid);
  } else {
  }
});