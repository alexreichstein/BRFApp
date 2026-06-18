// screens/TodoScreen.tsx
// Personlig to-do lista sparad i Firebase
// Lägg till, bocka av och radera uppgifter

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../firebase';

// Typ för en to-do uppgift
type Todo = {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
};

const TodoScreen = () => { 
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);

  // Hämtar todos från Firebase i realtid, sorterade efter skapandedatum
  useEffect(() => {
    const q = query(
      collection(db, 'todos'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Todo[];
      setTodos(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Lägger till en ny uppgift i Firebase
  const handleAdd = async () => {
    if (!input.trim()) return;
    try {
      await addDoc(collection(db, 'todos'), {
        text: input.trim(),
        done: false,
        createdAt: Date.now(),
      });
      setInput('');
    } catch (e) {
      Alert.alert('Fel', 'Kunde inte lägga till uppgiften.');
    }
  };

  // Togglar done/not done på en uppgift
  const handleToggle = async (todo: Todo) => {
    try {
      await updateDoc(doc(db, 'todos', todo.id), {
        done: !todo.done,
      });
    } catch (e) {
      Alert.alert('Fel', 'Kunde inte uppdatera uppgiften.');
    }
  };

  // Raderar en uppgift vid långtryck
  const handleDelete = (todo: Todo) => {
    Alert.alert(
      'Ta bort?',
      `"${todo.text}"`,
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Ta bort',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'todos', todo.id));
            } catch (e) {
              Alert.alert('Fel', 'Kunde inte radera uppgiften.');
            }
          },
        },
      ]
    );
  };

  // Separera klara och oklara uppgifter
  const pending = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>To-do</Text>
        <Text style={styles.counter}>
          {pending.length} kvar
        </Text>
      </View>

      {/* Inmatningsfält */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Lägg till uppgift..."
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addBtn, !input.trim() && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={!input.trim()}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>

        {/* Oklara uppgifter */}
        {pending.length === 0 && done.length === 0 && !loading && (
          <Text style={styles.empty}>Inga uppgifter än — lägg till något!</Text>
        )}

        {pending.map((todo) => (
          <TouchableOpacity
            key={todo.id}
            style={styles.card}
            onPress={() => handleToggle(todo)}
            onLongPress={() => handleDelete(todo)}
            activeOpacity={0.7}
          >
            {/* Checkbox */}
            <View style={styles.checkbox} />
            <Text style={styles.todoText}>{todo.text}</Text>
          </TouchableOpacity>
        ))}

        {/* Klara uppgifter */}
        {done.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Klara</Text>
            {done.map((todo) => (
              <TouchableOpacity
                key={todo.id}
                style={[styles.card, styles.cardDone]}
                onPress={() => handleToggle(todo)}
                onLongPress={() => handleDelete(todo)}
                activeOpacity={0.7}
              >
                <View style={styles.checkboxDone}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
                <Text style={styles.todoTextDone}>{todo.text}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
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
  counter: { fontSize: 14, color: '#1976D2', fontWeight: '600' },

  // Inmatningsfält
  inputRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fafafa',
  },
  addBtn: {
    backgroundColor: '#1976D2',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnDisabled: { backgroundColor: '#ccc' },
  addBtnText: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },

  list: { flex: 1, paddingTop: 8 },
  empty: { textAlign: 'center', marginTop: 60, color: '#aaa', fontSize: 15 },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#aaa',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Todo-kort
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 14,
    elevation: 1,
    gap: 12,
  },
  cardDone: { opacity: 0.6 },

  // Checkbox
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1976D2',
  },
  checkboxDone: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },

  todoText: { flex: 1, fontSize: 15, color: '#1a1a1a' },
  todoTextDone: { flex: 1, fontSize: 15, color: '#888', textDecorationLine: 'line-through' },
});
export default TodoScreen;