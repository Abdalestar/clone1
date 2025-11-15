import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import { StaffSession } from './src/types';
import { getStoredSession, logout } from './src/services/auth';
import nfcService from './src/services/nfc';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({ session }: { session: StaffSession }) {
  const handleIssueStamp = () => {
    console.log('Issue Stamp clicked');
  };

  const handleGenerateStamps = () => {
    console.log('Generate Stamps clicked');
  };

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#1976D2',
        tabBarInactiveTintColor: '#757575',
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        options={{
          tabBarIcon: () => '🏠',
        }}
      >
        {(props) => (
          <HomeScreen
            {...props}
            session={session}
            onIssueStamp={handleIssueStamp}
            onGenerateStamps={handleGenerateStamps}
          />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Inventory"
        options={{
          tabBarIcon: () => '📦',
        }}
      >
        {(props) => (
          <HomeScreen
            {...props}
            session={session}
            onIssueStamp={handleIssueStamp}
            onGenerateStamps={handleGenerateStamps}
          />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="History"
        options={{
          tabBarIcon: () => '📊',
        }}
      >
        {(props) => (
          <HomeScreen
            {...props}
            session={session}
            onIssueStamp={handleIssueStamp}
            onGenerateStamps={handleGenerateStamps}
          />
        )}
      </Tab.Screen>
      <Tab.Screen
        name="Settings"
        options={{
          tabBarIcon: () => '⚙️',
        }}
      >
        {(props) => (
          <HomeScreen
            {...props}
            session={session}
            onIssueStamp={handleIssueStamp}
            onGenerateStamps={handleGenerateStamps}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState<StaffSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeApp();

    return () => {
      nfcService.cleanup();
    };
  }, []);

  const initializeApp = async () => {
    try {
      await nfcService.initialize();
      const storedSession = await getStoredSession();
      setSession(storedSession);
    } catch (error) {
      console.error('Error initializing app:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (newSession: StaffSession) => {
    setSession(newSession);
  };

  const handleLogout = async () => {
    await logout();
    setSession(null);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="Main">
            {(props) => <MainTabs {...props} session={session} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Login">
            {(props) => <LoginScreen {...props} onLoginSuccess={handleLoginSuccess} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
