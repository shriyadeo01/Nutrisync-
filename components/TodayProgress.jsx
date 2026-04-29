import moment from 'moment'
import React, { useContext, useMemo } from 'react'
import { Text, View } from 'react-native'
import { UserContext } from '../context/UserContext'
import { useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import { getAppTheme } from '../constants/appTheme'

export default function TodayProgress() {
    const { user, isDarkMode } = useContext(UserContext)
    const t = getAppTheme(isDarkMode)
    
    // As per screenshot, we fetch precisely the total calories using the backend aggregator
    // Used useQuery instead of useConvex/useEffect so it updates reactively when meals are checked!
    const totalCaloriesConsumed = useQuery(api.mealPlan.GetTotalCaloriesConsumed, {
        userId: user?._id,
        date: moment().format('DD/MM/YYYY')
    }) || 0;

    const stats = useMemo(() => {
        const target = parseInt(user?.calories) || 2000;
        const percentage = Math.min((totalCaloriesConsumed / target) * 100, 100);
        
        return { consumed: totalCaloriesConsumed, target, percentage };
    }, [totalCaloriesConsumed, user]);

    if (!user) return null;

    return (
        <View style={{
            marginTop: 10,
            padding: 12,
            backgroundColor: t.card,
            borderRadius: 15,
            borderWidth: 1,
            borderColor: t.border
        }}>
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Text style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: t.text
                }}>{"Today's Progress"}</Text>
                <Text style={{
                    fontSize: 12,
                    color: t.muted
                }}>{moment().format('MMM DD, YYYY')}</Text>
            </View>

            <Text style={{
                fontSize: 24,
                fontWeight: '900',
                textAlign: 'center',
                marginTop: 10,
                color: '#6C63FF'
            }}>{totalCaloriesConsumed} / {user?.calories || 2000} kcal</Text>
            
            <Text style={{
                textAlign: 'center',
                marginTop: 2,
                fontSize: 12,
                color: t.muted
            }}>
                {stats.percentage >= 100 ? "Goal achieved! 🎉" : "Keep moving forward! 🔥"}
            </Text>

            <View style={{
                backgroundColor: t.barChartTrack,
                height: 8,
                borderRadius: 99,
                marginTop: 15,
                overflow: 'hidden'
            }}>
                <View style={{
                    backgroundColor: '#6C63FF',
                    width: `${stats.percentage}%`,
                    height: 8,
                    borderRadius: 99
                }} />
            </View>

            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 8 
            }}>
                <Text style={{ fontSize: 11, color: t.muted }}>Calories Consumed</Text>
                <Text style={{ fontSize: 11, color: '#6C63FF', fontWeight: 'bold' }}>{Math.round(stats.percentage)}%</Text>
            </View>
        </View>
    )
}
