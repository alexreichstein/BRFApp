// hooks/useProjectDocuments.ts
// Hook för dokument kopplade till ett specifikt projekt
// Alltid filtrerat per projectId — t.ex. avtal, kvitton, offerter för ett projekt
// Sparas i Firestore-collection "project_documents"

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
import { ProjectDocument } from '../types';

const PROJECT_DOCUMENTS_PATH = 'project_documents';

// projectId är obligatorisk — denna hook används alltid inuti ett projekts detaljvy
const useProjectDocuments = (projectId: string) => {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    // Hämtar dokument för aktuellt projekt sorterade på datum fallande
    const q = query(
      collection(db, PROJECT_DOCUMENTS_PATH),
      where('projectId', '==', projectId),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setError(null);
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as ProjectDocument[];
        setDocuments(data);
        setLoading(false);
      },
      (err) => {
        console.error('Firebase-fel:', err);
        setError('Kunde inte ansluta till servern.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [projectId]);

  // Skapar ett nytt projektdokument — projectId sätts alltid med
  const addDocument = async (document: Omit<ProjectDocument, 'id' | 'projectId'>): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, PROJECT_DOCUMENTS_PATH), {
        ...document,
        projectId,
      });
      return docRef.id;
    } catch (e) {
      throw new Error('Kunde inte spara dokumentet. Kontrollera din anslutning.');
    }
  };

  // Uppdaterar ett befintligt projektdokument
  const updateDocument = async (id: string, document: Omit<ProjectDocument, 'id'>): Promise<void> => {
    try {
      await updateDoc(doc(db, PROJECT_DOCUMENTS_PATH, id), { ...document });
    } catch (e) {
      throw new Error('Kunde inte uppdatera dokumentet. Kontrollera din anslutning.');
    }
  };

  // Raderar ett projektdokument
  const deleteDocument = async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, PROJECT_DOCUMENTS_PATH, id));
    } catch (e) {
      throw new Error('Kunde inte radera dokumentet. Kontrollera din anslutning.');
    }
  };

  return { documents, loading, error, addDocument, updateDocument, deleteDocument };
};

export default useProjectDocuments;