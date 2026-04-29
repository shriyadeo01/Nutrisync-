import { useRouter } from "expo-router";
import { useContext, useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, ScrollView, View } from "react-native";
import GenerateRecipeCard from "../../components/GenerateRecipeCard";
import HomeHeader from "../../components/HomeHeader";
import TodayProgress from "../../components/TodayProgress";
import TodaysMealPlan from "../../components/TodaysMealPlan";
import { UserContext } from "./../../context/UserContext";
import { getAppTheme } from "../../constants/appTheme";

export default function Home() {
  const { user, isDarkMode } = useContext(UserContext)
  const t = getAppTheme(isDarkMode);
  const router=useRouter();
  useEffect(()=>{
      if(!user?.weight)
      {
        router.replace('/preferance')
      }
  },[user])

  return (
    <ScrollView 
        showsVerticalScrollIndicator={false}
        style={{
          padding: 20,
          backgroundColor: t.bg,
          flex: 1
        }}>
      <HomeHeader/>
      <TodayProgress/>
      <GenerateRecipeCard/>
      <TouchableOpacity
        style={[styles.trackBtn, { backgroundColor: t.actionIconTintBg, borderColor: t.border }]}
        onPress={() => router.push('/diet-plan-progress')}
      >
        <Text style={[styles.trackBtnText, { color: isDarkMode ? '#6EE7B7' : '#047857' }]}>
          Track Your Progress
        </Text>
      </TouchableOpacity>
      <TodaysMealPlan/>
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  trackBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 8,
    marginBottom: 6,
  },
  trackBtnText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});