// hooks/useProjects.ts
// Hook för att hantera all Firebase-kommunikation kopplad till projekt
// Returnerar projekt och funktioner för att skapa, uppdatera och radera
// Projekt kan filtreras per styrelsemedlem via memberId

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
import { Project } from '../types';

// Sökvägen till projektsamlingen i Firestore
const PROJECTS_PATH = 'projects';

// Hook som exponerar projektdata och CRUD-operationer till UI-komponenter
// Om memberId skickas med filtreras bara den medlemmens projekt fram
const useProjects = (memberId: string | null = null) => {
  // Lista med projekt — antingen alla eller filtrerade per medlem
  const [projects, setProjects] = useState<Project[]>([]);

  // Indikerar om första laddningen från Firestore pågår
  const [loading, setLoading] = useState(true);

  // Felmeddelande om Firebase är nere — null om allt fungerar
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Bygger query beroende på om memberId skickats med eller inte
    const q = memberId
      ? query(
          collection(db, PROJECTS_PATH),
          where('memberId', '==', memberId),
          orderBy('createdAt', 'desc')
        )
      : query(
          collection(db, PROJECTS_PATH),
          orderBy('createdAt', 'desc')
        );

    // Prenumererar på realtidsuppdateringar från Firestore
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setError(null);
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Project[];
        setProjects(data);
        setLoading(false);
      },
      (err) => {
        console.error('Firebase-fel:', err);
        setError('Kunde inte ansluta till servern.');
        setLoading(false);
      }
    );

    // Avslutar prenumerationen när memberId ändras eller komponenten unmountas
    return () => unsubscribe();
  }, [memberId]);

  // Skapar ett nytt projekt i Firestore
  const addProject = async (project: Omit<Project, 'id'>): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, PROJECTS_PATH), project);
      return docRef.id;
    } catch (e) {
      throw new Error('Kunde inte spara projektet. Kontrollera din anslutning.');
    }
  };

  // Uppdaterar ett befintligt projekt i Firestore
  const updateProject = async (id: string, project: Omit<Project, 'id'>): Promise<void> => {
    try {
      await updateDoc(doc(db, PROJECTS_PATH, id), { ...project });
    } catch (e) {
      throw new Error('Kunde inte uppdatera projektet. Kontrollera din anslutning.');
    }
  };

  // Raderar ett projekt från Firestore baserat på id
  const deleteProject = async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, PROJECTS_PATH, id));
    } catch (e) {
      throw new Error('Kunde inte radera projektet. Kontrollera din anslutning.');
    }
  };

  // Returnerar data och funktioner som komponenter behöver
  return { projects, loading, error, addProject, updateProject, deleteProject };
};

export default useProjects;