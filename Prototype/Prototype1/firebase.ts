import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAxF-qlaOnRPl7qonkZs3Qyx_jcz9-QAyc",
  authDomain: "interviewprep-d3ba4.firebaseapp.com",
  projectId: "interviewprep-d3ba4",
  storageBucket: "interviewprep-d3ba4.firebasestorage.app",
  messagingSenderId: "14414655419",
  appId: "1:14414655419:web:f86b460ed015f19ed95e9e"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };