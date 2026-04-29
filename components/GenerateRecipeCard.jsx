import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Text, TouchableOpacity, View } from 'react-native'


export default function GenerateRecipeCard() {
  const router=useRouter()
  return (
    <LinearGradient
      colors={['#6C63FF', '#A78BFA', '#F0ABFC']}
      style={{
        marginTop: 15,
        padding: 15,
        borderRadius: 12
      }}
    >
      <Text style={{
        fontSize: 21,
        fontWeight: 'bold',
        color: '#FFFFFF'
      }}>
        Need Meal Ideas? ✨
      </Text>

      <Text style={{
        color: '#FFFFFF',
        fontSize: 16,
        opacity: 0.9,
        marginTop: 6
      }}>
        Let Our AI generate personalized recipes just for you!
      </Text>

      <TouchableOpacity 
      onPress={()=>router.push('/generate-ai-recipe')}
      style={{
        padding: 10,
        backgroundColor: '#6C63FF',
        marginTop: 12,
        borderRadius: 10,
        width: 180,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15
        
      }}>
        <Text style={{
          fontSize: 16,
          color: '#FFF',
          flex: 1,
          fontWeight: '600'
        }}>
          Generate AI
        </Text>

        <Ionicons name="chevron-forward" size={18} color="#FFF" />
      </TouchableOpacity>
    </LinearGradient>
  )
}