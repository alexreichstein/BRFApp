// App.tsx
// Appens rotkomponent — kopplar ihop SafeAreaProvider med navigationen
// SafeAreaProvider krävs för att SafeAreaView i varje skärm ska veta
// var den säkra zonen börjar (under klocka/batteri-statusbaren)

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Navigation from './navigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <Navigation />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
