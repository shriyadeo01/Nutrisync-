import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { UserContext } from './../context/UserContext';
import { getAppTheme } from "../constants/appTheme";
import { STORAGE_DARK_MODE } from "../constants/settingsStorage";

export default function RootLayout() {
  const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
    unsavedChangesWarning: false,
  });
  const [user, setUser] = useState();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem(STORAGE_DARK_MODE);
        const darkModeOn = v === "true";
        setIsDarkMode(darkModeOn);
        Appearance.setColorScheme(darkModeOn ? "dark" : "light");
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const theme = getAppTheme(isDarkMode);

  return (
    <ConvexProvider client={convex}>
      <UserContext.Provider value={{ user, setUser, isDarkMode, setIsDarkMode }}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.bg },
      }}>
        <Stack.Screen name="index" />
      </Stack>
      </UserContext.Provider>
    </ConvexProvider>
  );
}
