// firebase.ts
// Konfigurerar och initierar Firebase-anslutningen för BRFApp
// Exporterar Firestore-databasen som används i alla hooks

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase-konfiguration för BRFApp-projektet
const firebaseConfig = {
  apiKey: "AIzaSyCpivQw2tb-rVFV6BvgL50clwepQT4Z8kk",
  authDomain: "brfapp-2fa68.firebaseapp.com",
  projectId: "brfapp-2fa68",
  storageBucket: "brfapp-2fa68.firebasestorage.app",
  messagingSenderId: "1028105689988",
  appId: "1:1028105689988:web:6401a1fbaa1da53a629bd1"
};

// Initierar Firebase-appen
const app = initializeApp(firebaseConfig);

// Exporterar Firestore-databasen — används i useMembers, useProjects, useDocuments
export const db = getFirestore(app);