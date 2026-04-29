import { useContext } from 'react'
import { Image, Text, View } from 'react-native'
import { UserContext } from '../context/UserContext'
import { getAppTheme } from '../constants/appTheme'

export default function HomeHeader() {
    const { user, isDarkMode } = useContext(UserContext)
    const t = getAppTheme(isDarkMode)
  return (
    <View style={{
        display:'flex',
        flexDirection:'row',
        alignItems:'center',
        gap: 10
    }}>
      <Image source={require('./../assets/images/user.png')}
      style={{
        width:50,
        height:50,
        borderRadius:99,
        marginTop: 5
      }}/>
<View>
    <Text style={{
        fontSize:16,
        color: t.muted
    }}>Hello, 👋</Text>
    <Text style={{
        fontSize:20,
        fontWeight:'bold',
        color: t.text
    }}>{user?.name}</Text>
</View>

    </View>
  )
}

