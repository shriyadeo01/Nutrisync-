import { Ionicons } from '@expo/vector-icons'
import { useMutation } from 'convex/react'
import { useRouter } from 'expo-router'
import { useContext, useRef, useState } from 'react'
import { Alert, Animated, Text, TouchableOpacity, View } from 'react-native'
import { calculateNutrition } from '../../services/calorieCalculator'
import Button from './../../components/shared/Button'
import Input from './../../components/shared/Input'
import { UserContext } from './../../context/UserContext'
import { api } from './../../convex/_generated/api'
import { getAppTheme } from '../../constants/appTheme'

export default function index() {
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState(null)
  const [goal, setGoal] = useState(null)
  const [workoutPreference, setWorkoutPreference] = useState('both')

  const { user, setUser, isDarkMode } = useContext(UserContext)
  const router = useRouter()
  const t = getAppTheme(isDarkMode)

  const sLose = useRef(new Animated.Value(1)).current
  const sGain = useRef(new Animated.Value(1)).current
  const sMuscle = useRef(new Animated.Value(1)).current

  const pressIn = (scale) => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 35,
      bounciness: 6,
    }).start()
  }

  const pressOut = (scale) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 35,
      bounciness: 6,
    }).start()
  }

  const UpdateUserPref = useMutation(api.users.UpdateUserPref)

  const OnContinue = async () => {
    if (!weight || !height || !age || !gender || !goal) {
      Alert.alert('Fill All Details', 'Please enter weight, height, age, gender and goal.')
      return
    }

    if (!user?._id) {
      Alert.alert('User not found', 'Please login again.')
      return
    }

    const data = {
      uid: user._id,
      weight,
      height,
      age,
      gender,
      goal,
      workoutPreference,
    }

  const nutrition = calculateNutrition({
  weight,
  height,
  age,
  gender,
  goal,
});

console.log('Calories:', nutrition.calories);
console.log('Proteins:', nutrition.proteins);

data.calories = String(nutrition.calories);
data.proteins = String(nutrition.proteins);

    try {
      const result = await UpdateUserPref({ ...data })
      console.log(result)

      setUser(prev => ({
        ...prev,
        ...data
      }))

      router.replace('/(tabs)/Home')
    } catch (e) {
      Alert.alert('Error', 'Failed to save preferences. Please try again.')
      console.log(e)
    }
  }

  return (
    <View style={{
      flex: 1,
      padding: 20,
      backgroundColor: t.bg,
    }}>

      <Text style={{
        textAlign: 'center',
        fontSize: 35,
        fontWeight: 'bold',
        marginTop: 30,
        color: t.text
      }}>
        Tell us about yourself
      </Text>

      <Text style={{
        fontSize: 16,
        textAlign: 'center',
        color: t.muted,
        marginTop: 10,
        lineHeight: 22,
        paddingHorizontal: 20
      }}>
        This helps us create your personalized meal plan
      </Text>
{/* Weight, Height & Age */}
<View style={{
  flexDirection: 'row',
  gap: 8,
  marginTop: 20
}}>
  <View style={{ flex: 1 }}>
    <Input
      placeholder={'Eg.70'}
      label='Weight(kg)'
      value={weight}
      onChangeText={(v) => setWeight(v)}
      keyboardType="numeric"
    />
  </View>

  <View style={{ flex: 1 }}>
    <Input
      placeholder={'Eg. 5.10'}
      label='Height (ft)'
      value={height}
      onChangeText={(v) => setHeight(v)}
    />
  </View>

  <View style={{ flex: 1 }}>
    <Input
      placeholder={'Eg.21'}
      label='Age'
      value={age}
      onChangeText={(v) => setAge(v)}
      keyboardType="numeric"
    />
  </View>
</View>
      {/* Gender Section */}
      <View style={{ marginTop: 20 }}>
        <Text style={{
          fontWeight: '600',
          fontSize: 18,
          marginBottom: 10,
          color: t.text,
        }}>
          Gender
        </Text>

        <View style={{
          flexDirection: 'row',
          gap: 10
        }}>

          {/* Male */}
          <TouchableOpacity
            onPress={() => setGender('male')}
            activeOpacity={0.9}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: gender === 'male' ? '#6C63FF' : t.border,
              padding: 15,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: gender === 'male' ? (isDarkMode ? '#3730A3' : '#EEF0FF') : t.card
            }}>
            <Ionicons name="male" size={24} color="#4A90E2" />
            <Text style={{ marginTop: 5, color: t.text }}>Male</Text>
          </TouchableOpacity>

          {/* Female */}
          <TouchableOpacity
            onPress={() => setGender('female')}
            activeOpacity={0.9}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: gender === 'female' ? '#6C63FF' : t.border,
              padding: 15,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: gender === 'female' ? (isDarkMode ? '#3730A3' : '#EEF0FF') : t.card
            }}>
            <Ionicons name="female" size={24} color="#E91E63" />
            <Text style={{ marginTop: 5, color: t.text }}>Female</Text>
          </TouchableOpacity>

          {/* Other */}
          <TouchableOpacity
            onPress={() => setGender('other')}
            activeOpacity={0.9}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: gender === 'other' ? '#6C63FF' : t.border,
              padding: 15,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: gender === 'other' ? (isDarkMode ? '#3730A3' : '#EEF0FF') : t.card
            }}>
            <Ionicons name="transgender" size={24} color={t.muted} />
            <Text style={{ marginTop: 5, color: t.text }}>Other</Text>
          </TouchableOpacity>

        </View>
      </View>

      {/* Goal Section (Selectable + Smooth Animation) */}
      <View style={{ marginTop: 30 }}>

        <Text style={{
          fontWeight: '600',
          fontSize: 18,
          marginBottom: 15,
          color: t.text,
        }}>
          What's Your Goal?
        </Text>

        {/* Lose Weight */}
        <Animated.View style={{ transform: [{ scale: sLose }] }}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setGoal('lose')}
            onPressIn={() => pressIn(sLose)}
            onPressOut={() => pressOut(sLose)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 15,
              borderWidth: 1,
              borderColor: goal === 'lose' ? '#6C63FF' : t.border,
              borderRadius: 12,
              backgroundColor: goal === 'lose' ? (isDarkMode ? '#3730A3' : '#EEF0FF') : t.card,
              marginBottom: 12
            }}>

            <View style={{
              width: 45,
              height: 45,
              borderRadius: 25,
              backgroundColor: '#FFEAEA',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15
            }}>
              <Ionicons name="scale-outline" size={22} color="#FF4D4D" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: t.text }}>
                Lose Weight
              </Text>
              <Text style={{ fontSize: 13, color: t.muted, marginTop: 3 }}>
                Trim down and feel lighter
              </Text>
            </View>

            <Ionicons
              name="chevron-forward-outline"
              size={20}
              color={goal === 'lose' ? '#6C63FF' : '#AAA'}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Gain Weight */}
        <Animated.View style={{ transform: [{ scale: sGain }] }}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setGoal('gain')}
            onPressIn={() => pressIn(sGain)}
            onPressOut={() => pressOut(sGain)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 15,
              borderWidth: 1,
              borderColor: goal === 'gain' ? '#6C63FF' : t.border,
              borderRadius: 12,
              backgroundColor: goal === 'gain' ? (isDarkMode ? '#3730A3' : '#EEF0FF') : t.card,
              marginBottom: 12
            }}>

            <View style={{
              width: 45,
              height: 45,
              borderRadius: 25,
              backgroundColor: '#EAF2FF',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15
            }}>
              <Ionicons name="barbell-outline" size={22} color="#4A90E2" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: t.text }}>
                Gain Weight
              </Text>
              <Text style={{ fontSize: 13, color: t.muted, marginTop: 3 }}>
                Build mass healthily
              </Text>
            </View>

            <Ionicons
              name="chevron-forward-outline"
              size={20}
              color={goal === 'gain' ? '#6C63FF' : '#AAA'}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Build Muscle */}
        <Animated.View style={{ transform: [{ scale: sMuscle }] }}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setGoal('muscle')}
            onPressIn={() => pressIn(sMuscle)}
            onPressOut={() => pressOut(sMuscle)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 15,
              borderWidth: 1,
              borderColor: goal === 'muscle' ? '#6C63FF' : t.border,
              borderRadius: 12,
              backgroundColor: goal === 'muscle' ? (isDarkMode ? '#3730A3' : '#EEF0FF') : t.card
            }}>

            <View style={{
              width: 45,
              height: 45,
              borderRadius: 25,
              backgroundColor: '#E9F9F0',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15
            }}>
              <Ionicons name="fitness-outline" size={22} color="#28C76F" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: t.text }}>
                Build Muscle
              </Text>
              <Text style={{ fontSize: 13, color: t.muted, marginTop: 3 }}>
                Increase strength and definition
              </Text>
            </View>

            <Ionicons
              name="chevron-forward-outline"
              size={20}
              color={goal === 'muscle' ? '#6C63FF' : '#AAA'}
            />
          </TouchableOpacity>
        </Animated.View>

      </View>

      <View style={{ marginTop: 25 }}>
        <Text style={{
          fontWeight: '600',
          fontSize: 18,
          marginBottom: 10,
          color: t.text,
        }}>
          Workout Preference
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={() => setWorkoutPreference('home')}
            activeOpacity={0.9}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: workoutPreference === 'home' ? '#6C63FF' : t.border,
              backgroundColor: workoutPreference === 'home' ? (isDarkMode ? '#3730A3' : '#EEF0FF') : t.card,
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: t.text, fontWeight: '600' }}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setWorkoutPreference('gym')}
            activeOpacity={0.9}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: workoutPreference === 'gym' ? '#6C63FF' : t.border,
              backgroundColor: workoutPreference === 'gym' ? (isDarkMode ? '#3730A3' : '#EEF0FF') : t.card,
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: t.text, fontWeight: '600' }}>Gym</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setWorkoutPreference('both')}
            activeOpacity={0.9}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: workoutPreference === 'both' ? '#6C63FF' : t.border,
              backgroundColor: workoutPreference === 'both' ? (isDarkMode ? '#3730A3' : '#EEF0FF') : t.card,
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: t.text, fontWeight: '600' }}>Both</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ marginTop: 20 }}>
        <Button title={'Continue'} onPress={OnContinue} />
      </View>

    </View>
  )
}