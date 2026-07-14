import { initializeApp } from 'firebase/app';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBMm7mENz-MJeupKO8D5xcrAVfziZ-lvN0",
  authDomain: "gen-lang-client-0627106878.firebaseapp.com",
  projectId: "gen-lang-client-0627106878",
  storageBucket: "gen-lang-client-0627106878.firebasestorage.app",
  messagingSenderId: "102202827703",
  appId: "1:102202827703:web:44b31906f02a9ad88f3e32"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = initializeFirestore(app, {
  localCache: memoryLocalCache()
}, "ai-studio-marketfresh-6f169c13-fb7a-4643-ac33-ff94545fcbb0");

export { db };
