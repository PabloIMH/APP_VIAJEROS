import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, onSnapshot, serverTimestamp, arrayUnion, arrayRemove, orderBy, limit, deleteField }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDul4Wf-OzhugXQVrDbSF-kR9YEfqf4kXw",
  authDomain: "viajes-677d5.firebaseapp.com",
  projectId: "viajes-677d5",
  storageBucket: "viajes-677d5.firebasestorage.app",
  messagingSenderId: "195586680424",
  appId: "1:195586680424:web:3d639b746b292faa6e7ddd"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

