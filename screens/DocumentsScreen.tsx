// screens/DocumentsScreen.tsx
// Skärm för att visa och hantera dokument kopplade till ett projekt
// Visar alla dokument med typ, datum, belopp och anteckningar
// Tryck på ett dokument för att redigera, långtryck för att radera

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
import useDocuments from '../hooks/useDocuments';
import useProjects from '../hooks/useProjects';
import Constants from '../constants';
const DOCUMENT_COLORS = Constants.DOCUMENT_COLORS;
const DOCUMENT_TYPES = Constants.DOCUMENT_TYPES;
import { Document, DocumentType } from '../types';

export default function DocumentsScreen() {
  // Hämtar alla projekt — fallback till tom array för att undvika undefined-fel
  const { projects = [] } = useProjects();

  // Valt projekt — styr vilka dokument som visas
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Hämtar dokument för valt projekt — fallback till tom array
  const { documents = [], loading, error, addDocument, updateDocument, deleteDocument } =
    useDocuments(selectedProjectId);

  // Styr om formulärmodalen är synlig
  const [showModal, setShowModal] = useState(false);

  // Håller det dokument som redigeras — null betyder att vi skapar ett nytt
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);

  // Formulärfält
  const [title, setTitle] = useState('');
  const [type, setType] = useState<DocumentType>('Kvitto');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Öppnar modalen för att skapa nytt dokument
  const handleAdd = () => {
    if (!selectedProjectId) {
      Alert.alert('Välj ett projekt först');
      return;
    }
    setEditingDocument(null);
    setTitle('');
    setType('Kvitto');
    setDate(new Date().toLocaleDateString('sv-SE'));
    setAmount('');
    setNotes('');
    setShowModal(true);
  };

  // Öppnar modalen för att redigera befintligt dokument
  const handleEdit = (document: Document) => {
    setEditingDocument(document);
    setTitle(document.title);
    setType(document.type);
    setDate(new Date(document.date).toLocaleDateString('sv-SE'));
    setAmount(document.amount ? String(document.amount) : '');
    setNotes(document.notes);
    setShowModal(true);
  };

  // Konverterar datumsträngen till tidsstämpel
  // Returnerar aktuellt datum om strängen inte kan tolkas
  const parseDate = (dateStr: string): number => {
    const parsed = Date.parse(dateStr);
    return isNaN(parsed) ? Date.now() : parsed;
  };

  // Sparar nytt eller uppdaterat dokument till Firebase
  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Titel krävs');
      return;
    }
    if (!selectedProjectId) {
      Alert.alert('Inget projekt valt');
      return;
    }

    try {
      const data = {
        projectId: selectedProjectId,
        title: title.trim(),
        type,
        date: parseDate(date),
        amount: amount ? Number(amount) : null,
        notes: notes.trim(),
        createdAt: editingDocument?.createdAt ?? Date.now(),
      };

      if (editingDocument) {
        await updateDocument(editingDocument.id, data);
      } else {
        await addDocument(data);
      }

      setShowModal(false);
    } catch (e) {
      Alert.alert('Fel', 'Kunde inte spara dokumentet.');
    }
  };

  // Visar bekräftelsedialog och raderar dokumentet vid bekräftelse
  const handleDelete = (document: Document) => {
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

  // Formaterar ett datum-tidsstämpel till läsbar text
  const formatDate = (timestamp: number): string =>
    new Date(timestamp).toLocaleDateString('sv-SE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  // Laddningsskärm medan Firebase hämtar data
  if (loading && selectedProjectId) {
    return (
      <View style={styles.center}>
        <Text>Laddar...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Dokument</Text>
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Text style={styles.addBtnText}>+ Lägg till</Text>
        </TouchableOpacity>
      </View>

      {/* Felmeddelande om Firebase är nere */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Projektväljare — horisontell lista med alla projekt */}
      <View style={styles.projectSelector}>
        <Text style={styles.selectorLabel}>Välj projekt:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.projectChipRow}>
            {projects.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.projectChip,
                  selectedProjectId === p.id && styles.projectChipActive,
                ]}
                onPress={() => setSelectedProjectId(p.id)}
              >
                <Text style={[
                  styles.projectChipText,
                  selectedProjectId === p.id && styles.projectChipTextActive,
                ]}>
                  {p.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Lista med dokument */}
      <ScrollView style={styles.list}>
        {!selectedProjectId ? (
          <Text style={styles.empty}>Välj ett projekt för att se dokument</Text>
        ) : documents.length === 0 ? (
          <Text style={styles.empty}>Inga dokument för detta projekt</Text>
        ) : (
          documents.map((document) => (
            <TouchableOpacity
              key={document.id}
              style={styles.card}
              onPress={() => handleEdit(document)}
              onLongPress={() => handleDelete(document)}
            >
              {/* Färgad kant baserat på dokumenttyp */}
              <View
                style={[
                  styles.typeBar,
                  { backgroundColor: DOCUMENT_COLORS[document.type] ?? '#ccc' },
                ]}
              />

              <View style={styles.cardContent}>
                {/* Rubrikrad med titel och typchip */}
                <View style={styles.cardHeader}>
                  <Text style={styles.docTitle}>{document.title}</Text>
                  <View style={[
                    styles.typeChip,
                    { backgroundColor: DOCUMENT_COLORS[document.type] ?? '#ccc' },
                  ]}>
                    <Text style={styles.typeChipText}>{document.type}</Text>
                  </View>
                </View>

                {/* Datum */}
                <Text style={styles.docDate}>{formatDate(document.date)}</Text>

                {/* Belopp — visas bara om det finns */}
                {document.amount ? (
                  <Text style={styles.docAmount}>
                    {document.amount.toLocaleString('sv-SE')} kr
                  </Text>
                ) : null}

                {/* Anteckningar — visas bara om de finns */}
                {document.notes ? (
                  <Text style={styles.docNotes} numberOfLines={2}>
                    {document.notes}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* ─── Modal för att skapa/redigera dokument ─── */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>
                {editingDocument ? 'Redigera dokument' : 'Nytt dokument'}
              </Text>

              {/* Titelfält */}
              <Text style={styles.label}>Titel</Text>
              <TextInput
                style={styles.input}
                placeholder="Dokumentets titel"
                value={title}
                onChangeText={setTitle}
              />

              {/* Dokumenttypsväljare */}
              <Text style={styles.label}>Typ</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {DOCUMENT_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.chip,
                        type === t && {
                          backgroundColor: DOCUMENT_COLORS[t],
                          borderColor: DOCUMENT_COLORS[t],
                        },
                      ]}
                      onPress={() => setType(t as DocumentType)}
                    >
                      <Text style={[
                        styles.chipText,
                        type === t && styles.chipTextActive,
                      ]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Datumfält */}
              <Text style={styles.label}>Datum</Text>
              <TextInput
                style={styles.input}
                placeholder="ÅÅÅÅ-MM-DD"
                value={date}
                onChangeText={setDate}
              />

              {/* Beloppsfält */}
              <Text style={styles.label}>Belopp (kr)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />

              {/* Anteckningsfält */}
              <Text style={styles.label}>Anteckningar</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Skriv anteckningar här..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />

              {/* Spara-knapp */}
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>
                  {editingDocument ? 'Spara ändringar' : 'Lägg till dokument'}
                </Text>
              </TouchableOpacity>

              {/* Avbryt-knapp */}
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Avbryt</Text>
              </TouchableOpacity>

            </View>
          </ScrollView>
        </View>
      </Modal>
      {/* ─── Slut modal ─── */}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  addBtn: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  errorBanner: {
    backgroundColor: '#fff3cd',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorText: {
    color: '#856404',
    fontSize: 13,
    textAlign: 'center',
  },
  projectSelector: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
  },
  projectChipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  projectChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  projectChipActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  projectChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  projectChipTextActive: {
    color: '#fff',
  },
  list: {
    flex: 1,
    paddingTop: 8,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: '#aaa',
    fontSize: 15,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 1,
  },
  typeBar: {
    width: 6,
  },
  cardContent: {
    flex: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  docTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  docDate: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  docAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1976D2',
    marginBottom: 4,
  },
  docNotes: {
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  chipTextActive: {
    color: '#fff',
  },
  saveBtn: {
    backgroundColor: '#1976D2',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  cancelText: {
    textAlign: 'center',
    color: '#888',
    padding: 8,
  },
});