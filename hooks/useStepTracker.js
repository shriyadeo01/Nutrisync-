import { useState, useEffect, useRef } from 'react';
import { Pedometer } from 'expo-sensors';
import { PermissionsAndroid, Platform, Linking, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

const STORAGE_KEY = '@expo_pedometer_history';

export function useStepTracker() {
  const [baseSteps, setBaseSteps] = useState(0);
  const [liveSteps, setLiveSteps] = useState(0);
  const [storedSteps, setStoredSteps] = useState(0);
  
  const [isReady, setIsReady] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('loading'); // granted, denied, loading
  const [error, setError] = useState(null);

  const [sub, setSub] = useState(null);

  const requestPermission = async () => {
     let granted = false;
     try {
       if (Platform.OS === 'android') {
          const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
            {
              title: "Physical Activity Permission",
              message: "We need access to your physical activity to track your steps accurately.",
              buttonNeutral: "Ask Me Later",
              buttonNegative: "Cancel",
              buttonPositive: "OK"
            }
          );
          if (result === PermissionsAndroid.RESULTS.GRANTED) {
            // Force Expo Sensors to sync the newly granted native state
            await Pedometer.requestPermissionsAsync();
            granted = true;
          }
       } else {
          // iOS
          const perm = await Pedometer.requestPermissionsAsync();
          granted = perm.status === 'granted';
       }

       if (granted) {
         setPermissionStatus('granted');
         setError(null);
         await startTracking();
       } else {
         setPermissionStatus('denied');
         setError('Permission to access physical activity was permanently denied.');
       }
     } catch (err) {
       setError("Error requesting permissions: " + err.message);
     }
  };

  const startTracking = async () => {
      try {
        const available = await Pedometer.isAvailableAsync();
        setIsReady(available); // Set UI Ready state, but DO NOT block execution!
        setError(null); // Clear previous errors if any

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const now = new Date();

        let pastSteps = 0;
        try {
          // Fallback check since Pedometer.getStepCountAsync often fails in Expo Go
          const past = await Pedometer.getStepCountAsync(startOfDay, now);
          if (past && past.steps) pastSteps = past.steps;
        } catch (e) {
          // This silently fails safely if the sensor OS blocks historical fetches
        }
        
        setBaseSteps(pastSteps);
        
        // Reset live steps because baseSteps just securely loaded the absolute total from the system
        setLiveSteps(0);

        setSub(prevSub => {
           if (prevSub) prevSub.remove();
           return Pedometer.watchStepCount((res) => {
              setLiveSteps(res.steps || 0);
           });
        });

      } catch (e) {
         setError("Tracking Error: " + e.message);
      }
  };

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
        const todayKey = `${STORAGE_KEY}_${moment().format('YYYY-MM-DD')}`;
        const saved = await AsyncStorage.getItem(todayKey);
        if (saved && isMounted) setStoredSteps(parseInt(saved, 10));

        if (Platform.OS === 'android') {
           const hasPerm = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION);
           if (hasPerm) {
              if (isMounted) setPermissionStatus('granted');
              startTracking();
           } else {
              if (isMounted) setPermissionStatus('denied');
           }
        } else {
           const perm = await Pedometer.getPermissionsAsync();
           if (perm.status === 'granted') {
              if (isMounted) setPermissionStatus('granted');
              startTracking();
           } else {
              requestPermission();
           }
        }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  // AUTO SYNC WHEN APP IS OPENED
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && permissionStatus === 'granted') {
        startTracking();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [permissionStatus]);

  useEffect(() => {
     return () => {
        if (sub) sub.remove();
     };
  }, [sub]);

  // Compute absolute maximum baseline to guarantee we NEVER drop steps randomly on restarts/glitches.
  // We ADD liveSteps on top of the max baseline, so every step you take physically counts upward.
  const displaySteps = Math.max(baseSteps, storedSteps) + liveSteps;

  useEffect(() => {
    const todayKey = `${STORAGE_KEY}_${moment().format('YYYY-MM-DD')}`;
    AsyncStorage.setItem(todayKey, String(displaySteps)).catch(() => {});
  }, [displaySteps]);

  const resetSteps = async () => {
    const todayKey = `${STORAGE_KEY}_${moment().format('YYYY-MM-DD')}`;
    await AsyncStorage.setItem(todayKey, '0');
    setStoredSteps(0);
    setBaseSteps(0);
    setLiveSteps(0);
  };

  const openSettings = () => Linking.openSettings();

  const getDietSuggestion = (steps) => {
    if (steps < 4000) return 'Sedentary day: Suggest lighter meals with complex carbs and high fiber.';
    if (steps < 8000) return 'Moderate activity: Suggest balanced meals with good protein intake (e.g., 20-30g per meal).';
    return 'Highly active: Suggest high-protein meals with sufficient carbs for glycogen recovery!';
  };

  return {
    displaySteps,
    distanceKm: (displaySteps * 0.000762).toFixed(2),
    caloriesBurned: (displaySteps * 0.04).toFixed(0),
    isReady,
    error,
    permissionStatus,
    requestPermission,
    openSettings,
    dietSuggestion: getDietSuggestion(displaySteps),
    resetSteps
  };
}
