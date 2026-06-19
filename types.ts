// types.ts
// Definierar datastrukturerna för BRFApp
// Medlem, projekt, samt två separata dokumenttyper: arkiv och projektdokument

// Möjliga roller i en BRF-styrelse
export type MemberRole =
  | 'Ordförande'
  | 'Vice ordförande'
  | 'Kassör'
  | 'Sekreterare'
  | 'Ledamot'
  | 'Suppleant';

// Möjliga statusar för ett projekt
export type ProjectStatus = 'Planerat' | 'Pågående' | 'Klart' | 'Pausat';

// Möjliga dokumenttyper — gemensamt för både arkiv och projektdokument
export type DocumentType =
  | 'Kvitto'
  | 'Offert'
  | 'Protokoll'
  | 'Faktura'
  | 'Foto'
  | 'Avtal'
  | 'Övrigt';

// Styrelsemedlem
export type Member = {
  id: string;
  name: string;
  role: MemberRole;
  email: string;
  phone: string;
  createdAt: number;
};

// Projekt
export type Project = {
  id: string;
  title: string;
  description: string;
  memberId: string;
  status: ProjectStatus;
  deadline: number | null;
  budget: number | null;
  createdAt: number;
};

// Arkivdokument — fristående handlingar som stadgar, lån, generella dokument
// Sparas i Firestore-collection "archive_documents", ingen koppling till projekt
export type ArchiveDocument = {
  id: string;
  title: string;
  type: DocumentType;
  date: number;
  amount: number | null;
  notes: string;
  createdAt: number;
  fileUri?: string;    // Lokal URI till bifogad fil (PDF/bild från Filer-appen)
  fileName?: string;   // Filnamnet på den bifogade filen
};

// Projektdokument — handlingar kopplade till ett specifikt projekt
// Sparas i Firestore-collection "project_documents", alltid med projectId
export type ProjectDocument = {
  id: string;
  projectId: string;
  title: string;
  type: DocumentType;
  date: number;
  amount: number | null;
  notes: string;
  createdAt: number;
  fileUri?: string;    // Lokal URI till bifogad fil (PDF/bild från Filer-appen)
  fileName?: string;   // Filnamnet på den bifogade filen
};
