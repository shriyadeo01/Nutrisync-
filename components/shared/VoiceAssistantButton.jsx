import { Ionicons } from '@expo/vector-icons'
import { TouchableOpacity } from 'react-native'

export default function VoiceAssistantButton({ onPressIn, onPressOut, isListening }) {
  return (
    <TouchableOpacity
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={{
        position: 'absolute',
        bottom: 25,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: isListening ? '#EF4444' : '#6C63FF',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5
      }}
    >
      <Ionicons
        name={isListening ? 'stop' : 'mic'}
        size={28}
        color="#fff"
      />
    </TouchableOpacity>
  )
}