// screens/ProjectDetailScreen.tsx
// Detaljvy för ett enskilt projekt — visar projektinfo och dess dokument
// Navigeras till från ProjectsScreen
// Dokument hanteras helt separat från arkivet via useProjectDocuments

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import useProjectDocuments from '../hooks/useProjectDocuments';
import useMembers from '../hooks/useMembers';
import Constants from '../constants';
const DOCUMENT_COLORS = Constants.DOCUMENT_COLORS;
const DOCUMENT_TYPES = Constants.DOCUMENT_TYPES;
const STATUS_COLORS = Constants.STATUS_COLORS;
import { ProjectDocument, DocumentType } from '../types';
import { RootStackParamList } from '../navigation';

type NavigationProp = StackNavigationProp<RootStackParamList, 'ProjectDetail'>;
type RouteProps = RouteProp<RootStackParamList, 'ProjectDetail'>;

const ProjectDetailScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { project } = route.params;

  const { members = [] } = useMembers();
  const { documents = [], loading, error, addDocument, updateDocument, deleteDocument } =
    useProjectDocuments(project.id);

  const [showModal, setShowModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<ProjectDocument | null>(null);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<DocumentType>('Kvitto');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const getMemberName = (memberId: string): string =>
    members.find((m) => m.id === memberId)?.name ?? 'Okänd';

  const handleAdd = () => {
    setEditingDocument(null);
    setTitle('');
    setType('Kvitto');
    setDate(new Date().toLocaleDateString('sv-SE'));
    setAmount('');
    setNotes('');
    setShowModal(true);
  };

  const handleEdit = (document: ProjectDocument) => {
    setEditingDocument(document);
    setTitle(document.title);
    setType(document.type);
    setDate(new Date(document.date).toLocaleDateString('sv-SE'));
    setAmount(document.amount ? String(document.amount) : '');
    setNotes(document.notes);
    setShowModal(true);
  };

  const parseDate = (dateStr: string): number => {
    const parsed = Date.parse(dateStr);
    return isNaN(parsed) ? Date.now() : parsed;
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Titel krävs');
      return;
    }
    try {
      const data = {
        title: title.trim(),
        type,
        date: parseDate(date),
        amount: amount ? Number(amount) : null,
        notes: notes.trim(),
        createdAt: editingDocument?.createdAt ?? Date.now(),
      };
      if (editingDocument) {
        await updateDocument(editingDocument.id, { ...data, projectId: project.id });
      } else {
        await addDocument(data);
      }
      setShowModal(false);
    } catch (e) {
      Alert.alert('Fel', 'Kunde inte spara dokumentet.');
    }
  };

  const handleDelete = (document: ProjectDocument) => {
    Alert.alert(
      'Ta bort?',
      `Vill du ta bort "${document.title}"?`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Ta bort',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDocument(document.id);
            } catch (e) {
              Alert.alert('Fel', 'Kunde inte radera dokumentet.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number): string =>
    new Date(timestamp).toLocaleDateString('sv-SE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  return (
    <SafeAreaView style={styles.container}>

      {/* Header med tillbaka-knapp */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Tillbaka</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer}>

        {/* Projektinfo-kort */}
        <View style={styles.projectCard}>
          <View style={styles.projectHeader}>
            <Text style={styles.projectTitle}>{project.title}</Text>
            <View style={[styles.statusChip, { backgroundColor: STATUS_COLORS[project.status] ?? '#ccc' }]}>
              <Text style={styles.statusChipText}>{project.status}</Text>
            </View>
          </View>

          {project.description ? (
            <Text style={styles.projectDesc}>{project.description}</Text>
          ) : null}

          <View style={styles.projectMeta}>
            <Text style={styles.metaItem}>👤 {getMemberName(project.memberId)}</Text>
            {project.budget ? (
              <Text style={styles.metaItem}>💰 {project.budget.toLocaleString('sv-SE')} kr</Text>
            ) : null}
          </View>
        </View>

        {/* Dokument-sektion */}
        <View style={styles.documentsHeader}>
          <Text style={styles.documentsTitle}>Projektdokument</Text>
          <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
            <Text style={styles.addBtnText}>+ Lägg till</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loading ? (
          <Text style={styles.empty}>Laddar...</Text>
        ) : documents.length === 0 ? (
          <Text style={styles.empty}>Inga dokument för detta projekt än</Text>
        ) : (
          documents.map((document) => (
            <TouchableOpacity
              key={document.id}
              style={styles.card}
              onPress={() => handleEdit(document)}
              onLongPress={() => handleDelete(document)}
            >
              <View style={[styles.typeBar, { backgroundColor: DOCUMENT_COLORS[document.type] ?? '#ccc' }]} />
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.docTitle}>{document.title}</Text>
                  <View style={[styles.typeChip, { backgroundColor: DOCUMENT_COLORS[document.type] ?? '#ccc' }]}>
                    <Text style={styles.typeChipText}>{document.type}</Text>
                  </View>
                </View>
                <Text style={styles.docDate}>{formatDate(document.date)}</Text>
                {document.amount ? (
                  <Text style={styles.docAmount}>{document.amount.toLocaleString('sv-SE')} kr</Text>
                ) : null}
                {document.notes ? (
                  <Text style={styles.docNotes} numberOfLines={2}>{document.notes}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))
        )}

      </ScrollView>

      {/* Modal för att skapa/redigera projektdokument */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>
                {editingDocument ? 'Redigera dokument' : `Nytt dokument — ${project.title}`}
              </Text>

              <Text style={styles.label}>Titel</Text>
              <TextInput
                style={styles.input}
                placeholder="T.ex. Avtal med leverantör"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>Typ</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {DOCUMENT_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.chip,
                        type === t && { backgroundColor: DOCUMENT_COLORS[t], borderColor: DOCUMENT_COLORS[t] },
                      ]}
                      onPress={() => setType(t as DocumentType)}
                    >
                      <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.label}>Datum</Text>
              <TextInput
                style={styles.input}
                placeholder="ÅÅÅÅ-MM-DD"
                value={date}
                onChangeText={setDate}
              />

              <Text style={styles.label}>Belopp (kr)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Anteckningar</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Skriv anteckningar här..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>
                  {editingDocument ? 'Spara ändringar' : 'Lägg till dokument'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Avbryt</Text>
              </TouchableOpacity>

            </View>
          </ScrollView>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: { alignSelf: 'flex-start' },
  backBtnText: { color: '#1976D2', fontWeight: '600', fontSize: 15 },
  scrollContainer: { flex: 1 },

  // Projektkort
  projectCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 14,
    elevation: 1,
  },
  projectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  projectTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', flex: 1, marginRight: 8 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusChipText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  projectDesc: { fontSize: 14, color: '#666', marginBottom: 10 },
  projectMeta: { flexDirection: 'row', gap: 16 },
  metaItem: { fontSize: 13, color: '#888' },

  // Dokument-header
  documentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  documentsTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  addBtn: { backgroundColor: '#1976D2', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  errorBanner: { backgroundColor: '#fff3cd', paddingHorizontal: 16, paddingVertical: 8 },
  errorText: { color: '#856404', fontSize: 13, textAlign: 'center' },
  empty: { textAlign: 'center', marginTop: 24, marginBottom: 24, color: '#aaa', fontSize: 14 },

  card: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, overflow: 'hidden', elevation: 1 },
  typeBar: { width: 6 },
  cardContent: { flex: 1, padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  docTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', flex: 1, marginRight: 8 },
  typeChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  typeChipText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  docDate: { fontSize: 12, color: '#888', marginBottom: 4 },
  docAmount: { fontSize: 14, fontWeight: '700', color: '#1976D2', marginBottom: 4 },
  docNotes: { fontSize: 12, color: '#666' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingTop: 50, gap: 8, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#1a1a1a' },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#fff' },
  textArea: { height: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  chipTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: '#1976D2', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelText: { textAlign: 'center', color: '#888', padding: 8 },
});

export default ProjectDetailScreen;
