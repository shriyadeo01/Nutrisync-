import { Text, TouchableOpacity } from "react-native";

export default function Button({ title = "Get Started", onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={{
        backgroundColor: "#8A3FFC",
        marginHorizontal: 20,
        marginBottom: 30,
        paddingVertical: 20,
        borderRadius: 25,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 10,
      }}
    >
      <Text
        style={{
          color: "#FFFFFF",
          fontSize: 18,
          fontWeight: "700",
          textAlign: "center",
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}
