import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useContext } from 'react';
import ChatBot from '../../components/shared/ChatBot';
import { getAppTheme } from '../../constants/appTheme';
import { UserContext } from '../../context/UserContext';

export default function TabLayout() {
  const { isDarkMode } = useContext(UserContext);
  const t = getAppTheme(isDarkMode);

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#6C63FF',
          tabBarInactiveTintColor: t.tabInactive,
          headerShown: false,
          sceneContainerStyle: { backgroundColor: t.bg },
          tabBarStyle: {
            backgroundColor: t.tabBar,
            borderTopColor: t.tabBarBorder,
            borderTopWidth: 1,
          },
          tabBarActiveBackgroundColor: t.tabActiveBg,
        }}
      >
        <Tabs.Screen
          name="Home"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="Meals"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="restaurant-outline" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="Scan"
          options={{
            title: 'Scan',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="scan-outline" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="Profile"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="Progress"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="stats-chart-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      <ChatBot />
    </>
  );
}