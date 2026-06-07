// screens/MembersScreen.tsx
// Skärm för att visa och hantera styrelsemedlemmar
// Visar en lista med alla medlemmar och knapp för att lägga till ny
// Tryck på en medlem för att redigera, långtryck för att radera

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
import useMembers from '../hooks/useMembers';
import Constants from '../constants';
const MEMBER_ROLES = Constants.MEMBER_ROLES;
import { Member, MemberRole } from '../types';

export default function MembersScreen() {
  // Destructurerar med fallback för att undvika undefined-fel
  const result = useMembers();
  const members = result?.members ?? [];
  const loading = result?.loading ?? true;
  const error = result?.error ?? null;
  const addMember = result?.addMember;
  const updateMember = result?.updateMember;
  const deleteMember = result?.deleteMember;

  // Styr om formulärmodalen är synlig
  const [showModal, setShowModal] = useState(false);

  // Håller den medlem som redigeras — null betyder att vi skapar en ny
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Formulärfält
  const [name, setName] = useState('');
  const [role, setRole] = useState<MemberRole>('Ledamot');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Öppnar modalen för att skapa ny medlem
  const handleAdd = () => {
    setEditingMember(null);
    setName('');
    setRole('Ledamot');
    setEmail('');
    setPhone('');
    setShowModal(true);
  };

  // Öppnar modalen för att redigera befintlig medlem
  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setName(member.name);
    setRole(member.role);
    setEmail(member.email);
    setPhone(member.phone);
    setShowModal(true);
  };

  // Sparar ny eller uppdaterad medlem till Firebase
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Namn krävs');
      return;
    }

    try {
      const data = {
        name: name.trim(),
        role,
        email: email.trim(),
        phone: phone.trim(),
        createdAt: editingMember?.createdAt ?? Date.now(),
      };

      if (editingMember) {
        await updateMember?.(editingMember.id, data);
      } else {
        await addMember?.(data);
      }

      setShowModal(false);
    } catch (e) {
      Alert.alert('Fel', 'Kunde inte spara medlemmen.');
    }
  };

  // Visar bekräftelsedialog och raderar medlemmen vid bekräftelse
  const handleDelete = (member: Member) => {
    Alert.alert(
      'Ta bort?',
      `Vill du ta bort ${member.name} från styrelsen?`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Ta bort',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMember?.(member.id);
            } catch (e) {
              Alert.alert('Fel', 'Kunde inte radera medlemmen.');
            }
          },
        },
      ]
    );
  };

  // Laddningsskärm medan Firebase hämtar data
  if (loading) {
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
        <Text style={styles.title}>Styrelsen</Text>
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

      {/* Lista med styrelsemedlemmar */}
      <ScrollView style={styles.list}>
        {members.length === 0 ? (
          <Text style={styles.empty}>Inga medlemmar tillagda än</Text>
        ) : (
          members.map((member) => (
            <TouchableOpacity
              key={member.id}
              style={styles.card}
              onPress={() => handleEdit(member)}
              onLongPress={() => handleDelete(member)}
            >
              {/* Avatar med första bokstaven i namnet */}
              <View style={styles.cardLeft}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {member.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Medlemsinfo */}
              <View style={styles.cardContent}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberRole}>{member.role}</Text>
                {member.email ? (
                  <Text style={styles.memberContact}>{member.email}</Text>
                ) : null}
                {member.phone ? (
                  <Text style={styles.memberContact}>{member.phone}</Text>
                ) : null}
              </View>

              {/* Redigera-indikator */}
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* ─── Modal för att skapa/redigera medlem ─── */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {editingMember ? 'Redigera medlem' : 'Ny styrelsemedlem'}
            </Text>

            {/* Namnfält */}
            <Text style={styles.label}>Namn</Text>
            <TextInput
              style={styles.input}
              placeholder="Fullständigt namn"
              value={name}
              onChangeText={setName}
            />

            {/* Rollväljare */}
            <Text style={styles.label}>Roll</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.roleRow}>
                {MEMBER_ROLES.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.roleChip,
                      role === r && styles.roleChipActive,
                    ]}
                    onPress={() => setRole(r as MemberRole)}
                  >
                    <Text style={[
                      styles.roleChipText,
                      role === r && styles.roleChipTextActive,
                    ]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* E-postfält */}
            <Text style={styles.label}>E-post</Text>
            <TextInput
              style={styles.input}
              placeholder="exempel@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Telefonfält */}
            <Text style={styles.label}>Telefon</Text>
            <TextInput
              style={styles.input}
              placeholder="070-000 00 00"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            {/* Spara-knapp */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>
                {editingMember ? 'Spara ändringar' : 'Lägg till'}
              </Text>
            </TouchableOpacity>

            {/* Avbryt-knapp */}
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.cancelText}>Avbryt</Text>
            </TouchableOpacity>

          </View>
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
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 14,
    elevation: 1,
  },
  cardLeft: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  cardContent: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 13,
    color: '#1976D2',
    fontWeight: '500',
    marginBottom: 2,
  },
  memberContact: {
    fontSize: 12,
    color: '#888',
  },
  chevron: {
    fontSize: 24,
    color: '#ccc',
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
  roleRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  roleChipActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  roleChipTextActive: {
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