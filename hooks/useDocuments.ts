// hooks/useDocuments.ts
// Hook för att hantera all Firebase-kommunikation kopplad till dokument
// Returnerar dokument och funktioner för att skapa, uppdatera och radera
// Dokument filtreras alltid per projekt via projectId

import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Document } from '../types';

// Sökvägen till dokumentsamlingen i Firestore
const DOCUMENTS_PATH = 'documents';

// Hook som exponerar dokumentdata och CRUD-operationer till UI-komponenter
// projectId styr vilka dokument som hämtas — alltid filtrerat per projekt
const useDocuments = (projectId: string | null = null) => {
  // Lista med dokument för aktuellt projekt
  const [documents, setDocuments] = useState<Document[]>([]);

  // Indikerar om första laddningen från Firestore pågår
  const [loading, setLoading] = useState(true);

  // Felmeddelande om Firebase är nere — null om allt fungerar
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Om inget projectId skickats med — hämta inga dokument
    if (!projectId) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    // Hämtar dokument för aktuellt projekt sorterade på datum fallande
    const q = query(
      collection(db, DOCUMENTS_PATH),
      where('projectId', '==', projectId),
      orderBy('date', 'desc')
    );

    // Prenumererar på realtidsuppdateringar från Firestore
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setError(null);
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Document[];
        setDocuments(data);
        setLoading(false);
      },
      (err) => {
        console.error('Firebase-fel:', err);
        setError('Kunde inte ansluta till servern.');
        setLoading(false);
      }
    );

    // Avslutar prenumerationen när projectId ändras eller komponenten unmountas
    return () => unsubscribe();
  }, [projectId]);

  // Skapar ett nytt dokument i Firestore
  const addDocument = async (document: Omit<Document, 'id'>): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, DOCUMENTS_PATH), document);
      return docRef.id;
    } catch (e) {
      throw new Error('Kunde inte spara dokumentet. Kontrollera din anslutning.');
    }
  };

  // Uppdaterar ett befintligt dokument i Firestore
  const updateDocument = async (id: string, document: Omit<Document, 'id'>): Promise<void> => {
    try {
      await updateDoc(doc(db, DOCUMENTS_PATH, id), { ...document });
    } catch (e) {
      throw new Error('Kunde inte uppdatera dokumentet. Kontrollera din anslutning.');
    }
  };

  // Raderar ett dokument från Firestore baserat på id
  const deleteDocument = async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, DOCUMENTS_PATH, id));
    } catch (e) {
      throw new Error('Kunde inte radera dokumentet. Kontrollera din anslutning.');
    }
  };

  // Returnerar data och funktioner som komponenter behöver
  return { documents, loading, error, addDocument, updateDocument, deleteDocument };
};

export default useDocuments;