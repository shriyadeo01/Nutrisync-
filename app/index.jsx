import { useConvex } from "convex/react";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useContext, useEffect, useRef } from "react";
import {
  Animated,
  Image,
  ImageBackground,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { UserContext } from "../context/UserContext";
import { api } from "../convex/_generated/api";
import { auth } from "../services/FirebaseConfig";

export default function Index() {
  const router = useRouter();
  const convex = useConvex();
  const { setUser } = useContext(UserContext);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // ✅ ADDED: Start animation so UI becomes visible (NOT removing anything)
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ✅ Your existing auth logic (unchanged)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (userInfo) => {
      try {
        console.log(userInfo?.email); // ✅ EXACT RN LOG FORMAT

        if (!userInfo?.email) return;

        const userData = await convex.query(api.users.getUser, {
          email: userInfo.email,
        });

        console.log(userData); // ✅ logs database user

        if (userData) {
          setUser(userData);
          router.replace('/(tabs)/Home');
          return;
        }

        await signOut(auth);
      } catch (e) {
        console.log(e);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <ImageBackground
        source={require("../assets/images/landing.jpeg")}
        resizeMode="cover"
        style={styles.background}
      >
        <Animated.View style={[styles.topSection, { opacity: fadeAnim }]}>
          <Image
            source={require("../assets/images/logo.png")}
            resizeMode="contain"
            style={styles.logo}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.bottomSection,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.textWrapper}>
            <Text style={styles.mainTitle}>AI Diet Planner</Text>
            <Text style={styles.subTitle}>
              Personalized meals powered by AI to{"\n"}help you eat smart and live healthy.
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/auth/SignIn")}
            style={styles.buttonContainer}
          >
            <LinearGradient
              colors={["#8A3FFC", "#6929C4"]}
              style={styles.button}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.buttonText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1, justifyContent: "space-between", paddingBottom: 50 },
  topSection: { alignItems: "center", marginTop: 80 },
  logo: { width: 350, height: 350, marginBottom: 5 },
  bottomSection: { paddingHorizontal: 30 },
  textWrapper: { marginBottom: 30, alignItems: "center" },
  mainTitle: {
    fontSize: 36,
    fontWeight: "900",
    color: "#121212",
    textAlign: "center",
    marginBottom: 10,
  },
  subTitle: {
    fontSize: 17,
    color: "#444",
    textAlign: "center",
    lineHeight: 24,
  },
  buttonContainer: { width: "100%" },
  button: {
    height: 62,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#6929C4",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonText: { color: "#FFF", fontSize: 18, fontWeight: "700" },
});