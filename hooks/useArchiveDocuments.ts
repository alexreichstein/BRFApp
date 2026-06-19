// hooks/useArchiveDocuments.ts
// Hook för fristående arkivdokument — stadgar, lån, generella handlingar
// Helt separerad från projekt — ingen projectId, ingen filtrering
// Sparas i Firestore-collection "archive_documents"

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
} from 'firebase/firestore';
import { db } from '../firebase';
import { ArchiveDocument } from '../types';

const ARCHIVE_PATH = 'archive_documents';

const useArchiveDocuments = () => {
  const [documents, setDocuments] = useState<ArchiveDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Hämtar alla arkivdokument sorterade på datum fallande
    const q = query(
      collection(db, ARCHIVE_PATH),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setError(null);
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as ArchiveDocument[];
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
  }, []);

  // Skapar ett nytt arkivdokument
  const addDocument = async (document: Omit<ArchiveDocument, 'id'>): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, ARCHIVE_PATH), document);
      return docRef.id;
    } catch (e) {
      throw new Error('Kunde inte spara dokumentet. Kontrollera din anslutning.');
    }
  };

  // Uppdaterar ett befintligt arkivdokument
  const updateDocument = async (id: string, document: Omit<ArchiveDocument, 'id'>): Promise<void> => {
    try {
      await updateDoc(doc(db, ARCHIVE_PATH, id), { ...document });
    } catch (e) {
      throw new Error('Kunde inte uppdatera dokumentet. Kontrollera din anslutning.');
    }
  };

  // Raderar ett arkivdokument
  const deleteDocument = async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, ARCHIVE_PATH, id));
    } catch (e) {
      throw new Error('Kunde inte radera dokumentet. Kontrollera din anslutning.');
    }
  };

  return { documents, loading, error, addDocument, updateDocument, deleteDocument };
};

export default useArchiveDocuments;