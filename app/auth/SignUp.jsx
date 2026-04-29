import { useMutation } from "convex/react";
import { Link } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useContext, useState } from "react";
import { Alert, Image, Text, View } from "react-native";
import Button from "../../components/shared/Button";
import Input from "../../components/shared/Input";
import { UserContext } from "../../context/UserContext";
import { api } from "../../convex/_generated/api";
import { auth } from "../../services/FirebaseConfig";

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ✅ module name = users (because file is convex/users.js)
  const createNewUser = useMutation(api.users.createNewUser);

  const { setUser } = useContext(UserContext);

  const onSignUp = async () => {
    if (!name || !email || !password) {
      Alert.alert("Missing Fields!", "Enter all field values");
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);

      const result = await createNewUser({
        name,
        email,
      });

      console.log("User Created:", result);   // ✅ added
      setUser(result);
      //Navigate to home screen
      Alert.alert("Success", "Account created successfully!");
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        Alert.alert("Error", "Email already registered");
      } else if (error.code === "auth/invalid-email") {
        Alert.alert("Error", "Invalid email format");
      } else if (error.code === "auth/weak-password") {
        Alert.alert("Error", "Password must be at least 6 characters");
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

      <Text style={{ fontSize: 35, fontWeight: "bold" }}>
        Create New Account
      </Text>

      <View style={{ marginTop: 20, width: "100%" }}>
        <Input placeholder="Full Name" onChangeText={setName} value={name} />
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
        <Button title="Create Account" onPress={onSignUp} />

        <Text style={{ textAlign: "center", fontSize: 18, marginTop: 15 }}>
          Already have an account?
        </Text>

        <Link href="/auth/SignIn">
          <Text
            style={{
              textAlign: "center",
              fontSize: 18,
              marginTop: 5,
              fontWeight: "bold",
            }}
          >
            Sign In Here
          </Text>
        </Link>
      </View>
    </View>
  );
}