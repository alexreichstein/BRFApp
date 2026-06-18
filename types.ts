// types.ts
// Definierar datastrukturerna för BRFApp
// Tre huvudtyper: styrelsemedlem, projekt och dokument

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

// Möjliga dokumenttyper
export type DocumentType =
  | 'Kvitto'
  | 'Offert'
  | 'Protokoll'
  | 'Faktura'
  | 'Foto'
  | 'Avtal'
  | 'Övrigt';

// Definierar datastrukturen för en styrelsemedlem
export type Member = {
  id: string;
  name: string;               // Fullständigt namn
  role: MemberRole;           // Roll i styrelsen
  email: string;              // E-postadress
  phone: string;              // Telefonnummer
  createdAt: number;          // Tidsstämpel när medlemmen lades till
};

// Definierar datastrukturen för ett projekt
export type Project = {
  id: string;
  title: string;              // Projektets namn
  description: string;        // Beskrivning av projektet
  memberId: string;           // ID på ansvarig styrelsemedlem
  status: ProjectStatus;      // Nuvarande status
  deadline: number | null;    // Deadline som tidsstämpel, null om ingen deadline
  budget: number | null;      // Budget i kronor, null om ingen budget
  createdAt: number;          // Tidsstämpel när projektet skapades
};

// Definierar datastrukturen för ett dokument kopplat till ett projekt
export type Document = {
  id: string;
  projectId: string;          // ID på projektet dokumentet tillhör
  title: string;              // Dokumentets titel/beskrivning
  type: DocumentType;         // Typ av dokument
  date: number;               // Datum för dokumentet som tidsstämpel
  amount: number | null;      // Belopp i kronor (för kvitton/fakturor), null annars
  notes: string;              // Anteckningar om dokumentet
  createdAt: number;          // Tidsstämpel när dokumentet lades till
};