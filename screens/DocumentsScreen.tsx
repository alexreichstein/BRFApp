// screens/DocumentsScreen.tsx
// Skärm för fristående arkivdokument — stadgar, lån, generella handlingar
// Helt separerad från projekt, ingen projektväljare
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
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import useArchiveDocuments from '../hooks/useArchiveDocuments';
import Constants from '../constants';
const DOCUMENT_COLORS = Constants.DOCUMENT_COLORS;
const DOCUMENT_TYPES = Constants.DOCUMENT_TYPES;
import { ArchiveDocument, DocumentType } from '../types';

const OCR_API_KEY = 'K89147065988957';
const OCR_API_URL = 'https://api.ocr.space/parse/image';

const DocumentsScreen = () => {
  const { documents = [], loading, error, addDocument, updateDocument, deleteDocument } =
    useArchiveDocuments();

  const [showModal, setShowModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<ArchiveDocument | null>(null);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<DocumentType>('Avtal');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Bifogad fil — lokal URI och filnamn
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const [scanning, setScanning] = useState(false);

  const handleAdd = () => {
    setEditingDocument(null);
    setTitle('');
    setType('Avtal');
    setDate(new Date().toLocaleDateString('sv-SE'));
    setAmount('');
    setNotes('');
    setFileUri(null);
    setFileName(null);
    setShowModal(true);
  };

  const handleEdit = (document: ArchiveDocument) => {
    setEditingDocument(document);
    setTitle(document.title);
    setType(document.type);
    setDate(new Date(document.date).toLocaleDateString('sv-SE'));
    setAmount(document.amount ? String(document.amount) : '');
    setNotes(document.notes);
    setFileUri(document.fileUri ?? null);
    setFileName(document.fileName ?? null);
    setShowModal(true);
  };

  // Öppnar Filer-appen för att välja PDF, bild eller annat dokument
  // Filen sparas lokalt och bara URI:n + filnamnet sparas i Firestore
  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      setFileUri(asset.uri);
      setFileName(asset.name);

      // Föreslå titel baserat på filnamnet om titeln är tom
      if (!title) {
        setTitle(asset.name.replace(/\.[^/.]+$/, ''));
      }
    } catch (e) {
      console.error('Fel vid filval:', e);
      Alert.alert('Fel', 'Kunde inte välja filen.');
    }
  };

  // Tar bort den bifogade filen från formuläret
  const handleRemoveFile = () => {
    setFileUri(null);
    setFileName(null);
  };

  // Öppnar en bifogad fil via systemets delningsmeny
  // Detta visar filen i Förhandsgranska, Mail, eller annan app som kan öppna filtypen
  const handleOpenFile = async (uri: string) => {
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Fel', 'Kan inte öppna filer på denna enhet.');
        return;
      }
      await Sharing.shareAsync(uri);
    } catch (e) {
      console.error('Fel vid öppning av fil:', e);
      Alert.alert('Fel', 'Kunde inte öppna filen. Den kan ha tagits bort från enheten.');
    }
  };

  // ─── OCR ───────────────────────────────────────────────────────────────────

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
      if (match) return match[1].replace(/\s/g, '').replace(',', '.');
    }
    return '';
  };

  const extractDate = (text: string): string => {
    const patterns = [
      /(\d{4}-\d{2}-\d{2})/,
      /(\d{2}\/\d{2}\/\d{4})/,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[0];
    }
    return new Date().toLocaleDateString('sv-SE');
  };

  const handleScan = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Behörighet saknas', 'Appen behöver tillgång till kameran.');
        return;
      }

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

      const formData = new FormData();
      formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
      formData.append('language', 'swe,eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('detectOrientation', 'true');
      formData.append('scale', 'true');
      formData.append('OCREngine', '2');

      const response = await fetch(OCR_API_URL, {
        method: 'POST',
        headers: { 'apikey': OCR_API_KEY },
        body: formData,
      });

      const data = await response.json();

      if (data.IsErroredOnProcessing || !data.ParsedResults?.[0]?.ParsedText) {
        setScanning(false);
        Alert.alert('Scanning misslyckades', `Fel: ${data.ErrorMessage?.[0] ?? 'Okänt fel'}. Försök med bättre belysning.`);
        return;
      }

      const text = data.ParsedResults[0].ParsedText;
      const foundAmount = extractAmount(text);
      const foundDate = extractDate(text);

      if (foundAmount) setAmount(foundAmount);
      if (foundDate) setDate(foundDate);

      const firstLine = text.split('\n').find((l: string) => l.trim().length > 3)?.trim() ?? '';
      if (firstLine && !title) setTitle(firstLine.substring(0, 50));

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
    try {
      const data = {
        title: title.trim(),
        type,
        date: parseDate(date),
        amount: amount ? Number(amount) : null,
        notes: notes.trim(),
        createdAt: editingDocument?.createdAt ?? Date.now(),
        fileUri: fileUri ?? undefined,
        fileName: fileName ?? undefined,
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

  const handleDelete = (document: ArchiveDocument) => {
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

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Laddar...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.title}>Dokumentarkiv</Text>
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Text style={styles.addBtnText}>+ Lägg till</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>Stadgar, lån och andra fristående handlingar</Text>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView style={styles.list}>
        {documents.length === 0 ? (
          <Text style={styles.empty}>Inga dokument i arkivet än</Text>
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
                {document.fileName ? (
                  <TouchableOpacity onPress={(e) => {
                    e.stopPropagation();
                    if (document.fileUri) handleOpenFile(document.fileUri);
                  }}>
                    <Text style={styles.docFile} numberOfLines={1}>📎 {document.fileName} — Öppna</Text>
                  </TouchableOpacity>
                ) : null}
                {document.notes ? (
                  <Text style={styles.docNotes} numberOfLines={2}>{document.notes}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        {/* Overlay är klickbar — trycker man utanför modalen stängs den */}
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          {/* Modalens innehåll fångar klick så de inte stänger modalen av misstag */}
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <ScrollView>
              <View style={styles.modal}>

                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>
                    {editingDocument ? 'Redigera dokument' : 'Nytt arkivdokument'}
                  </Text>
                  <View style={styles.headerBtnRow}>
                    <TouchableOpacity
                      style={styles.fileBtn}
                      onPress={handlePickFile}
                    >
                      <Text style={styles.fileBtnText}>📁 Filer</Text>
                    </TouchableOpacity>
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
                    {/* X-knapp för att stänga modalen utan att spara */}
                    <TouchableOpacity
                      style={styles.closeBtn}
                      onPress={() => setShowModal(false)}
                    >
                      <Text style={styles.closeBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>

              {/* Visar bifogad fil om en har valts */}
              {fileName && (
                <View style={styles.fileChip}>
                  <Text style={styles.fileChipText} numberOfLines={1}>📎 {fileName}</Text>
                  <TouchableOpacity onPress={handleRemoveFile}>
                    <Text style={styles.fileChipRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}

              {scanning && (
                <View style={styles.scanningBanner}>
                  <ActivityIndicator size="small" color="#1976D2" />
                  <Text style={styles.scanningText}>  Läser text från bilden...</Text>
                </View>
              )}

              <Text style={styles.label}>Titel</Text>
              <TextInput
                style={styles.input}
                placeholder="T.ex. Stadgar 2026"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>Typ</Text>
              <View style={styles.chipRowWrap}>
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
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#fff',
  },
  title: { fontSize: 24, fontWeight: '700', color: '#1a1a1a' },
  subtitle: {
    fontSize: 13,
    color: '#888',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  addBtn: { backgroundColor: '#1976D2', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  errorBanner: { backgroundColor: '#fff3cd', paddingHorizontal: 16, paddingVertical: 8 },
  errorText: { color: '#856404', fontSize: 13, textAlign: 'center' },
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
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingTop: 50, gap: 8, maxHeight: '85%' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  headerBtnRow: { flexDirection: 'row', gap: 6 },
  scanBtn: { backgroundColor: '#2E7D32', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, minWidth: 90, alignItems: 'center' },
  scanBtnDisabled: { backgroundColor: '#888' },
  scanBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Filer-knapp
  fileBtn: { backgroundColor: '#6A4C93', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, minWidth: 80, alignItems: 'center' },
  fileBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Stäng-knapp (X) i modalens header
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { color: '#666', fontSize: 16, fontWeight: '700' },

  // Visar vald fil i formuläret
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  fileChipText: { color: '#6A4C93', fontSize: 13, flex: 1, marginRight: 8 },
  fileChipRemove: { color: '#6A4C93', fontWeight: '700', fontSize: 16 },

  // Filindikator på dokumentkortet
  docFile: { fontSize: 12, color: '#6A4C93', marginBottom: 4 },

  scanningBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', padding: 10, borderRadius: 8, marginBottom: 4 },
  scanningText: { color: '#1976D2', fontSize: 13 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#fff' },
  textArea: { height: 100, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chipRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  chipTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: '#1976D2', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelText: { textAlign: 'center', color: '#888', padding: 8 },
});

export default DocumentsScreen;
