import { useConvex } from "convex/react";
import { Link, useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useContext, useState } from "react";
import { Alert, Image, Text, View } from "react-native";
import Button from "../../components/shared/Button";
import Input from "../../components/shared/Input";
import { UserContext } from "../../context/UserContext";
import { api } from "../../convex/_generated/api";
import { auth } from "../../services/FirebaseConfig";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const convex = useConvex();
  const router = useRouter(); // ✅ added
  const { setUser } = useContext(UserContext);

  const onSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Missing Fields!", "Enter all field values");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);

      // ✅ module name = users
      const userData = await convex.query(api.users.getUser, { email });

      if (userData) {
        console.log("User Signed In:", userData);
        setUser(userData);

        router.replace("/(tabs)/Home"); // ✅ added (go to Home)
      } else {
        Alert.alert("Error", "User not found in database");
      }
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        Alert.alert("Error", "User not found");
      } else if (error.code === "auth/wrong-password") {
        Alert.alert("Error", "Incorrect password");
      } else {
        Alert.alert("Error", error.message);
      }
    }
  };

  return (
    <View style={{ alignItems: "center", padding: 20 }}>
      <Image
        source={require("./../../assets/images/logo.png")}
        style={{ width: 250, height: 250, marginTop: 60 }}
      />

      <Text style={{ fontSize: 35, fontWeight: "bold" }}>Welcome Back</Text>

      <View style={{ marginTop: 20, width: "100%" }}>
        <Input
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          value={email}
        />

        <Input
          placeholder="Password"
          password={true}
          onChangeText={setPassword}
          value={password}
        />
      </View>

      <View style={{ marginTop: 15, width: "100%" }}>
        <Button title="Sign In" onPress={onSignIn} />

        <Text style={{ textAlign: "center", fontSize: 18, marginTop: 15 }}>
          Don't have an account?
        </Text>

        <Link href="/auth/SignUp">
          <Text
            style={{
              textAlign: "center",
              fontSize: 18,
              marginTop: 5,
              fontWeight: "bold",
            }}
          >
            Create New Account
          </Text>
        </Link>
      </View>
    </View>
  );
}