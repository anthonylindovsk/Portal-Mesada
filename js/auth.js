import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { app } from "./firebase-config.js";

const auth = getAuth(app);

signInAnonymously(auth)
  .then(() => {
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    console.error(errorCode, errorMessage);
  });

onAuthStateChanged(auth, (user) => {
  if (user) {
    const uid = user.uid;
    console.log("uid ativo:", uid);
  } else {
  }
});
