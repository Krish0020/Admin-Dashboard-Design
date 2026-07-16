import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Tera Firebase config (screenshot se extract kiya hua)
const firebaseConfig = {
  apiKey: "AIzaSyDnOsp8ys_E2MJviWYHdrUVJiKx4a5SBn8",
  authDomain: "shrushti-society-app.firebaseapp.com",
  projectId: "shrushti-society-app",
  storageBucket: "shrushti-society-app.firebasestorage.app",
  messagingSenderId: "1006292075403",
  appId: "1:1006292075403:web:df619dd137f6263d4ee58e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Database (Firestore) aur usko export karna
export const db = getFirestore(app);