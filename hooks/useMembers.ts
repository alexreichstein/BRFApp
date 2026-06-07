// hooks/useMembers.ts
// Hook för att hantera all Firebase-kommunikation kopplad till styrelsemedlemmar
// Returnerar medlemmar och funktioner för att skapa, uppdatera och radera

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
import { Member } from '../types';

// Sökvägen till medlemssamlingen i Firestore
const MEMBERS_PATH = 'members';

// Hook som exponerar medlemsdata och CRUD-operationer till UI-komponenter
const useMembers = () => {
  // Lista med alla styrelsemedlemmar hämtade från Firestore
  const [members, setMembers] = useState<Member[]>([]);

  // Indikerar om första laddningen från Firestore pågår
  const [loading, setLoading] = useState(true);

  // Felmeddelande om Firebase är nere — null om allt fungerar
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Hämtar alla medlemmar sorterade på namn stigande
    const q = query(
      collection(db, MEMBERS_PATH),
      orderBy('name', 'asc')
    );

    // Prenumererar på realtidsuppdateringar från Firestore
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setError(null);
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Member[];
        setMembers(data);
        setLoading(false);
      },
      (err) => {
        console.error('Firebase-fel:', err);
        setError('Kunde inte ansluta till servern.');
        setLoading(false);
      }
    );

    // Avslutar prenumerationen när komponenten unmountas
    return () => unsubscribe();
  }, []);

  // Skapar en ny styrelsemedlem i Firestore
  const addMember = async (member: Omit<Member, 'id'>): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, MEMBERS_PATH), member);
      return docRef.id;
    } catch (e) {
      throw new Error('Kunde inte spara medlemmen. Kontrollera din anslutning.');
    }
  };

  // Uppdaterar en befintlig styrelsemedlem i Firestore
  const updateMember = async (id: string, member: Omit<Member, 'id'>): Promise<void> => {
    try {
      await updateDoc(doc(db, MEMBERS_PATH, id), { ...member });
    } catch (e) {
      throw new Error('Kunde inte uppdatera medlemmen. Kontrollera din anslutning.');
    }
  };

  // Raderar en styrelsemedlem från Firestore baserat på id
  const deleteMember = async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, MEMBERS_PATH, id));
    } catch (e) {
      throw new Error('Kunde inte radera medlemmen. Kontrollera din anslutning.');
    }
  };

  // Returnerar data och funktioner som komponenter behöver
  return { members, loading, error, addMember, updateMember, deleteMember };
};

export default useMembers;