import { useContext } from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { UserContext } from '../context/UserContext'
import { getAppTheme } from '../constants/appTheme'

export default function RecipeOptionList({ recipeOption, onRecipeOptionSelect }) {
  const { isDarkMode } = useContext(UserContext)
  const t = getAppTheme(isDarkMode)

  return (
    <View style={{
      marginTop: 20
    }}>
      <Text style={{
        fontSize: 20,
        fontWeight: 'bold',
        color: t.text,
      }}>
        Select Recipe
      </Text>

      <View>
        {recipeOption?.map((item, index) => (
          <TouchableOpacity
            onPress={() => onRecipeOptionSelect && onRecipeOptionSelect(item)}
            key={index}
            style={{
              padding: 15,
              borderWidth: 0.2,
              borderRadius: 15,
              marginTop: 15,
              backgroundColor: t.card,
              borderColor: t.border,
            }}
          >
            <Text style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: t.text
            }}>
              {index + 1}. {item?.recipeName}
            </Text>

            <Text style={{
              color: t.muted,
              marginTop: 5
            }}>
              {item?.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}
