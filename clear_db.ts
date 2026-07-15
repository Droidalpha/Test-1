import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBMm7mENz-MJeupKO8D5xcrAVfziZ-lvN0",
  authDomain: "gen-lang-client-0627106878.firebaseapp.com",
  projectId: "gen-lang-client-0627106878",
  storageBucket: "gen-lang-client-0627106878.firebasestorage.app",
  messagingSenderId: "102202827703",
  appId: "1:102202827703:web:44b31906f02a9ad88f3e32"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-marketfresh-6f169c13-fb7a-4643-ac33-ff94545fcbb0");

async function clear() {
  const snapshot = await getDocs(collection(db, 'products'));
  for (const doc of snapshot.docs) {
    await deleteDoc(doc.ref);
  }
  console.log("Cleared products!");
}
clear();
