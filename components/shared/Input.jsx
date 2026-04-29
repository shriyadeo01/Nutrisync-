import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

export default function Input({
  placeholder,
  password = false,
  onChangeText,
  label = "",
  value,
  ...props
}) {
  const [secure, setSecure] = useState(password);

  return (
    <View style={{
      marginTop: 15,
      width:'100%',

    }}>

      {/* Label */}
      {label ? (
        <Text style={{
          fontWeight: '500',   
          fontSize: 18,
          marginBottom: 5
        }}>
          {label}
        </Text>
      ) : null}

      {/* Input Field */}
      <View style={{
        flexDirection: "row",
        alignItems: "center"
      }}>
        <TextInput
          placeholder={placeholder}
          secureTextEntry={secure}
          onChangeText={(value) => onChangeText && onChangeText(value)}
          value={value}
          style={{
            padding: 15,
            borderWidth: 1,
            borderColor: "#DDD",
            borderRadius: 10,
            fontSize: 18,
            paddingVertical: 20,
            width: "100%",
            marginTop: 2
          }}
          {...props}
        />

        {password && (
          <TouchableOpacity
            onPress={() => setSecure(!secure)}
            style={{ position: "absolute", right: 15 }}
          >
            <Ionicons
              name={secure ? "eye-off-outline" : "eye-outline"}
              size={22}
              color="#666"
            />
          </TouchableOpacity>
        )}
      </View>

    </View>
  );
}