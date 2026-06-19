// screens/ProjectsScreen.tsx
// Skärm för att visa och hantera projekt
// Visar alla projekt med status, ansvarig medlem och deadline
// Tryck på ett projekt öppnar detaljvyn med projektets egna dokument
// Långtryck för att radera, redigera-knapp för att ändra projektinfo

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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import useProjects from '../hooks/useProjects';
import useMembers from '../hooks/useMembers';
import Constants from '../constants';
const STATUS_COLORS = Constants.STATUS_COLORS;
const PROJECT_STATUSES = Constants.PROJECT_STATUSES;
import { Project, ProjectStatus } from '../types';
import { RootStackParamList } from '../navigation';

type NavigationProp = StackNavigationProp<RootStackParamList, 'ProjectsList'>;

export default function ProjectsScreen() {
  const navigation = useNavigation<NavigationProp>();

  const { projects = [], loading, error, addProject, updateProject, deleteProject } = useProjects();
  const { members = [] } = useMembers();

  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [status, setStatus] = useState<ProjectStatus>('Planerat');
  const [budget, setBudget] = useState('');

  const handleAdd = () => {
    setEditingProject(null);
    setTitle('');
    setDescription('');
    setSelectedMemberId(members[0]?.id ?? '');
    setStatus('Planerat');
    setBudget('');
    setShowModal(true);
  };

  // Öppnar redigeringsmodalen — separat från att öppna projektets detaljvy
  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setTitle(project.title);
    setDescription(project.description);
    setSelectedMemberId(project.memberId);
    setStatus(project.status);
    setBudget(project.budget ? String(project.budget) : '');
    setShowModal(true);
  };

  // Navigerar till projektets detaljvy med dess egna dokument
  const handleOpenProject = (project: Project) => {
    navigation.navigate('ProjectDetail', { project });
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Titel krävs');
      return;
    }
    if (!selectedMemberId) {
      Alert.alert('Välj en ansvarig medlem');
      return;
    }
    try {
      const data = {
        title: title.trim(),
        description: description.trim(),
        memberId: selectedMemberId,
        status,
        deadline: null,
        budget: budget ? Number(budget) : null,
        createdAt: editingProject?.createdAt ?? Date.now(),
      };
      if (editingProject) {
        await updateProject(editingProject.id, data);
      } else {
        await addProject(data);
      }
      setShowModal(false);
    } catch (e) {
      Alert.alert('Fel', 'Kunde inte spara projektet.');
    }
  };

  const handleDelete = (project: Project) => {
    Alert.alert(
      'Ta bort?',
      `Vill du ta bort projektet "${project.title}"?`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Ta bort',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProject(project.id);
            } catch (e) {
              Alert.alert('Fel', 'Kunde inte radera projektet.');
            }
          },
        },
      ]
    );
  };

  const getMemberName = (memberId: string): string => {
    return members.find((m) => m.id === memberId)?.name ?? 'Okänd';
  };

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
        <Text style={styles.title}>Projekt</Text>
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
          <Text style={styles.addBtnText}>+ Lägg till</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Lista med projekt — tryck öppnar detaljvy, långtryck visar redigera/radera-val */}
      <ScrollView style={styles.list}>
        {projects.length === 0 ? (
          <Text style={styles.empty}>Inga projekt tillagda än</Text>
        ) : (
          projects.map((project) => (
            <TouchableOpacity
              key={project.id}
              style={styles.card}
              onPress={() => handleOpenProject(project)}
              onLongPress={() =>
                Alert.alert(
                  project.title,
                  'Vad vill du göra?',
                  [
                    { text: 'Avbryt', style: 'cancel' },
                    { text: 'Redigera', onPress: () => handleEdit(project) },
                    { text: 'Ta bort', style: 'destructive', onPress: () => handleDelete(project) },
                  ]
                )
              }
            >
              <View style={[styles.statusBar, { backgroundColor: STATUS_COLORS[project.status] ?? '#ccc' }]} />

              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.projectTitle}>{project.title}</Text>
                  <View style={[styles.statusChip, { backgroundColor: STATUS_COLORS[project.status] ?? '#ccc' }]}>
                    <Text style={styles.statusChipText}>{project.status}</Text>
                  </View>
                </View>

                {project.description ? (
                  <Text style={styles.projectDesc} numberOfLines={2}>{project.description}</Text>
                ) : null}

                <View style={styles.cardFooter}>
                  <Text style={styles.projectMember}>👤 {getMemberName(project.memberId)}</Text>
                  {project.budget ? (
                    <Text style={styles.projectBudget}>{project.budget.toLocaleString('sv-SE')} kr</Text>
                  ) : null}
                </View>
              </View>

              {/* Chevron som indikerar att kortet kan öppnas */}
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* ─── Modal för att skapa/redigera projekt ─── */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>
                {editingProject ? 'Redigera projekt' : 'Nytt projekt'}
              </Text>

              <Text style={styles.label}>Titel</Text>
              <TextInput
                style={styles.input}
                placeholder="Projektets namn"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>Beskrivning</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Beskriv projektet..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Ansvarig</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {members.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.chip, selectedMemberId === m.id && styles.chipActive]}
                      onPress={() => setSelectedMemberId(m.id)}
                    >
                      <Text style={[styles.chipText, selectedMemberId === m.id && styles.chipTextActive]}>
                        {m.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.label}>Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {PROJECT_STATUSES.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.chip,
                        status === s && { backgroundColor: STATUS_COLORS[s], borderColor: STATUS_COLORS[s] },
                      ]}
                      onPress={() => setStatus(s as ProjectStatus)}
                    >
                      <Text style={[styles.chipText, status === s && styles.chipTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.label}>Budget (kr)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={budget}
                onChangeText={setBudget}
                keyboardType="numeric"
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>
                  {editingProject ? 'Spara ändringar' : 'Skapa projekt'}
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
  list: { flex: 1, paddingTop: 8 },
  empty: { textAlign: 'center', marginTop: 40, color: '#aaa', fontSize: 15 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, overflow: 'hidden', elevation: 1 },
  statusBar: { width: 6, height: '100%' },
  cardContent: { flex: 1, padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  projectTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', flex: 1, marginRight: 8 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusChipText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  projectDesc: { fontSize: 13, color: '#666', marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  projectMember: { fontSize: 12, color: '#888' },
  projectBudget: { fontSize: 12, fontWeight: '600', color: '#1976D2' },
  chevron: { fontSize: 24, color: '#ccc', paddingRight: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingTop: 50, gap: 8, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#1a1a1a' },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#fff' },
  textArea: { height: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#1976D2', borderColor: '#1976D2' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  chipTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: '#1976D2', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  cancelText: { textAlign: 'center', color: '#888', padding: 8 },
});
