import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: "ai-diet-planner-e3bd1.firebaseapp.com",
  projectId: "ai-diet-planner-e3bd1",
  storageBucket: "ai-diet-planner-e3bd1.firebasestorage.app",
  messagingSenderId: "898399443082",
  appId: "1:898399443082:web:9389cb764075de2f4a7573",
  measurementId: "G-G91DXDD2TV",
};

const app = initializeApp(firebaseConfig);

export const auth =
  Platform.OS === "web"
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
      });
