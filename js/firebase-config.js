import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, Timestamp, onSnapshot, query, orderBy, where, doc, updateDoc, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyD3d5yKWu5hjggINLWUGmJEG6XbngVP9IE",
  authDomain: "portal-mesada.firebaseapp.com",
  projectId: "portal-mesada",
  storageBucket: "portal-mesada.firebasestorage.app",
  messagingSenderId: "237825551972",
  appId: "1:237825551972:web:53066aed9e287b354ab971",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { collection, addDoc, Timestamp, onSnapshot, query, orderBy, where, doc, updateDoc, serverTimestamp, runTransaction, ref, uploadBytes, getDownloadURL };