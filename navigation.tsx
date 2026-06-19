// navigation.tsx
// Hanterar all navigering i BRFApp
// Bottom tab navigation med fyra flikar: Medlemmar, Projekt, Dokument (arkiv), To-do
// ProjectsStack innehåller även ProjectDetailScreen för projektets egna dokument

import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';
import MembersScreen from './screens/MembersScreen';
import ProjectsScreen from './screens/ProjectsScreen';
import ProjectDetailScreen from './screens/ProjectDetailScreen';
import DocumentsScreen from './screens/DocumentsScreen';
import TodoScreen from './screens/TodoScreen';
import { Project } from './types';

// Definierar parametrar för stack-navigeringen
// ProjectDetail tar emot hela projekt-objektet för att undvika extra Firebase-läsning
export type RootStackParamList = {
  MembersList: undefined;
  ProjectsList: undefined;
  ProjectDetail: { project: Project };
  DocumentsList: undefined;
};

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator<RootStackParamList>();

function MembersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MembersList" component={MembersScreen} />
    </Stack.Navigator>
  );
}

// Projects-stack innehåller både listan och detaljvyn med projektdokument
function ProjectsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProjectsList" component={ProjectsScreen} />
      <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
    </Stack.Navigator>
  );
}

function DocumentsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DocumentsList" component={DocumentsScreen} />
    </Stack.Navigator>
  );
}

export default function Navigation() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#1976D2',
          tabBarInactiveTintColor: '#9E9E9E',
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#f0f0f0',
            paddingBottom: 4,
            height: 60,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="Medlemmar"
          component={MembersStack}
          options={{ tabBarIcon: () => <Text style={{ fontSize: 22 }}>👥</Text> }}
        />
        <Tab.Screen
          name="Projekt"
          component={ProjectsStack}
          options={{ tabBarIcon: () => <Text style={{ fontSize: 22 }}>📋</Text> }}
        />
        <Tab.Screen
          name="Dokument"
          component={DocumentsStack}
          options={{ tabBarIcon: () => <Text style={{ fontSize: 22 }}>📄</Text> }}
        />
        <Tab.Screen
          name="To-do"
          component={TodoScreen}
          options={{ tabBarIcon: () => <Text style={{ fontSize: 22 }}>✅</Text> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
