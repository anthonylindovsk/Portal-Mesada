const firebaseConfig = {
  apiKey: "AIzaSyD3d5yKWu5hjggINLWUGmJEG6XbngVP9IE",
  authDomain: "portal-mesada.firebaseapp.com",
  projectId: "portal-mesada",
  storageBucket: "portal-mesada.firebasestorage.app",
  messagingSenderId: "237825551972",
  appId: "1:237825551972:web:53066aed9e287b354ab971"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
