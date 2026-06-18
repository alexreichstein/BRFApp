// screens/DocumentsScreen.tsx
// Skärm för att visa och hantera dokument kopplade till ett projekt
// Visar alla dokument med typ, datum, belopp och anteckningar
// Tryck på ett dokument för att redigera, långtryck för att radera
// Kamera + OCR: ta foto på ett dokument och extrahera text via OCR.space API

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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import useDocuments from '../hooks/useDocuments';
import useProjects from '../hooks/useProjects';
import Constants from '../constants';
const DOCUMENT_COLORS = Constants.DOCUMENT_COLORS;
const DOCUMENT_TYPES = Constants.DOCUMENT_TYPES;
import { Document, DocumentType } from '../types';

// OCR.space API-nyckel — gratis tier, 25 000 anrop per månad
const OCR_API_KEY = 'K89147065988957';
const OCR_API_URL = 'https://api.ocr.space/parse/image';

export default function DocumentsScreen() {
  const { projects = [] } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { documents = [], loading, error, addDocument, updateDocument, deleteDocument } =
    useDocuments(selectedProjectId);

  const [showModal, setShowModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);

  // Formulärfält
  const [title, setTitle] = useState('');
  const [type, setType] = useState<DocumentType>('Kvitto');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  // OCR-status — visar laddningsindikator under scanning
  const [scanning, setScanning] = useState(false);

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

  // ─── OCR: försöker extrahera belopp från text ─────────────────────────────

  const extractAmount = (text: string): string => {
    const patterns = [
      /totalt[:\s]+(\d[\d\s]*[,.]?\d*)/i,
      /total[:\s]+(\d[\d\s]*[,.]?\d*)/i,
      /summa[:\s]+(\d[\d\s]*[,.]?\d*)/i,
      /att betala[:\s]+(\d[\d\s]*[,.]?\d*)/i,
      /(\d{1,6}[,.]\d{2})\s*kr/i,
      /kr\s*(\d{1,6}[,.]\d{2})/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].replace(/\s/g, '').replace(',', '.');
      }
    }
    return '';
  };

  // Försöker extrahera datum från text
  const extractDate = (text: string): string => {
    const patterns = [
      /(\d{4}-\d{2}-\d{2})/,
      /(\d{2}\/\d{2}\/\d{4})/,
      /(\d{4})\s*[-/]\s*(\d{1,2})\s*[-/]\s*(\d{1,2})/,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[0];
    }
    return new Date().toLocaleDateString('sv-SE');
  };

  // ─── OCR: ta foto och skicka till OCR.space ───────────────────────────────

  const handleScan = async () => {
    try {
      // Be om kamerabehörighet
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Behörighet saknas', 'Appen behöver tillgång till kameran.');
        return;
      }

      // Öppna kameran — base64 krävs för att skicka till OCR.space
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets[0]) return;

      const base64Image = result.assets[0].base64;
      if (!base64Image) {
        Alert.alert('Fel', 'Kunde inte läsa bilden.');
        return;
      }

      setScanning(true);

      // Skicka bilden till OCR.space API som base64
      const formData = new FormData();
      formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
      formData.append('language', 'swe');        // Svenska
      formData.append('isOverlayRequired', 'false');
      formData.append('detectOrientation', 'true');
      formData.append('scale', 'true');
      formData.append('OCREngine', '2');          // Engine 2 är bättre på tryckt text

      const response = await fetch(OCR_API_URL, {
        method: 'POST',
        headers: {
          'apikey': OCR_API_KEY,
        },
        body: formData,
      });

      const data = await response.json();

      // Kontrollera att vi fick text tillbaka
      if (data.IsErroredOnProcessing || !data.ParsedResults?.[0]?.ParsedText) {
        setScanning(false);
        Alert.alert('Scanning misslyckades', 'Kunde inte läsa text från bilden. Försök med bättre belysning.');
        return;
      }

      const text = data.ParsedResults[0].ParsedText;

      // Extrahera information från texten
      const foundAmount = extractAmount(text);
      const foundDate = extractDate(text);

      // Fyll i formulärfälten med extraherad data
      if (foundAmount) setAmount(foundAmount);
      if (foundDate) setDate(foundDate);

      // Första raden som titel om titeln är tom
      const firstLine = text.split('\n').find((l: string) => l.trim().length > 3)?.trim() ?? '';
      if (firstLine && !title) {
        setTitle(firstLine.substring(0, 50));
      }

      // Hela texten i anteckningsfältet som referens
      setNotes(text.trim().substring(0, 500));

      setScanning(false);
      Alert.alert(
        'Scanning klar! ✓',
        `${foundAmount ? `Belopp: ${foundAmount} kr\n` : ''}${foundDate ? `Datum: ${foundDate}\n` : ''}Granska och justera fälten.`
      );
    } catch (e) {
      setScanning(false);
      console.error('OCR-fel:', e);
      Alert.alert('Fel', 'Kunde inte skanna dokumentet. Kontrollera internetanslutningen.');
    }
  };

  // ──────────────────────────────────────────────────────────────────────────

  const parseDate = (dateStr: string): number => {
    const parsed = Date.parse(dateStr);
    return isNaN(parsed) ? Date.now() : parsed;
  };

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

  const formatDate = (timestamp: number): string =>
    new Date(timestamp).toLocaleDateString('sv-SE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

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

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Projektväljare */}
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

      {/* Dokumentlista */}
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

      {/* ─── Modal för att skapa/redigera dokument ─── */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modal}>

              {/* Header med titel och skanna-knapp */}
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>
                  {editingDocument ? 'Redigera dokument' : 'Nytt dokument'}
                </Text>
                <TouchableOpacity
                  style={[styles.scanBtn, scanning && styles.scanBtnDisabled]}
                  onPress={handleScan}
                  disabled={scanning}
                >
                  {scanning ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.scanBtnText}>📷 Skanna</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Scanning-banner */}
              {scanning && (
                <View style={styles.scanningBanner}>
                  <ActivityIndicator size="small" color="#1976D2" />
                  <Text style={styles.scanningText}>  Läser text från bilden...</Text>
                </View>
              )}

              <Text style={styles.label}>Titel</Text>
              <TextInput
                style={styles.input}
                placeholder="Dokumentets titel"
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
                placeholder="Anteckningar eller skannad text visas här..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
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
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  title: { fontSize: 24, fontWeight: '700', color: '#1a1a1a' },
  addBtn: { backgroundColor: '#1976D2', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  errorBanner: { backgroundColor: '#fff3cd', paddingHorizontal: 16, paddingVertical: 8 },
  errorText: { color: '#856404', fontSize: 13, textAlign: 'center' },
  projectSelector: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectorLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 8 },
  projectChipRow: { flexDirection: 'row', gap: 8 },
  projectChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff' },
  projectChipActive: { backgroundColor: '#1976D2', borderColor: '#1976D2' },
  projectChipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  projectChipTextActive: { color: '#fff' },
  list: { flex: 1, paddingTop: 8 },
  empty: { textAlign: 'center', marginTop: 40, color: '#aaa', fontSize: 15 },
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
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 8 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  scanBtn: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  scanBtnDisabled: { backgroundColor: '#888' },
  scanBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scanningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  scanningText: { color: '#1976D2', fontSize: 13 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#fff' },
  textArea: { height: 100, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  chipTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: '#1976D2', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelText: { textAlign: 'center', color: '#888', padding: 8 },
});
