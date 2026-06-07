// constants.ts
// Konstanter som används i hela appen
// Färger per projektstatus och rollbeskrivningar

// Färger för projektstatus — används i ProjectCard och ProjectsScreen
export const STATUS_COLORS: Record<string, string> = {
  'Planerat': '#9E9E9E',   // Grå — inget har börjat
  'Pågående': '#1976D2',   // Blå — aktivt arbete
  'Klart':    '#388E3C',   // Grön — avslutat
  'Pausat':   '#F57C00',   // Orange — pausat tills vidare
};

// Färger för dokumenttyper — används i DocumentCard
export const DOCUMENT_COLORS: Record<string, string> = {
  'Kvitto':   '#E53935',   // Röd
  'Offert':   '#8E24AA',   // Lila
  'Protokoll':'#1E88E5',   // Blå
  'Faktura':  '#F4511E',   // Orange-röd
  'Foto':     '#43A047',   // Grön
  'Avtal':    '#00897B',   // Teal
  'Övrigt':   '#757575',   // Grå
};

// Alla tillgängliga roller i styrelsen
export const MEMBER_ROLES = [
  'Ordförande',
  'Vice ordförande',
  'Kassör',
  'Sekreterare',
  'Ledamot',
  'Suppleant',
];

// Alla tillgängliga projektstatusar
export const PROJECT_STATUSES = [
  'Planerat',
  'Pågående',
  'Klart',
  'Pausat',
];

// Alla tillgängliga dokumenttyper
export const DOCUMENT_TYPES = [
  'Kvitto',
  'Offert',
  'Protokoll',
  'Faktura',
  'Foto',
  'Avtal',
  'Övrigt',
];

export default {
  STATUS_COLORS,
  DOCUMENT_COLORS,
  MEMBER_ROLES,
  PROJECT_STATUSES,
  DOCUMENT_TYPES,
};