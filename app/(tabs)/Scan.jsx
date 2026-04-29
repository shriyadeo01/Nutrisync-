import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  EncodingType,
  readAsStringAsync,
} from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MealScanResults, { parseMealScanResult } from '../../components/MealScanResults';
import { getAppTheme } from '../../constants/appTheme';
import { UserContext } from '../../context/UserContext';
import { analyzeFoodImageNutrition } from '../../services/AiModel';

const HIDE_SCAN_FOOTER_HINT_KEY = 'meal_scan_hide_footer_hint';

export default function ScanScreen() {
  const { user, isDarkMode } = useContext(UserContext);
  const t = getAppTheme(isDarkMode);
  const insets = useSafeAreaInsets();

  const [phase, setPhase] = useState('idle');
  const [imageUri, setImageUri] = useState(null);
  const [result, setResult] = useState(null);
  const [hideFooterHint, setHideFooterHint] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const v = await AsyncStorage.getItem(HIDE_SCAN_FOOTER_HINT_KEY);
        if (alive && v === '1') setHideFooterHint(true);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const persistHideHint = useCallback(async () => {
    setHideFooterHint(true);
    try {
      await AsyncStorage.setItem(HIDE_SCAN_FOOTER_HINT_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const runAnalysis = useCallback(async (base64, mimeType, uri) => {
    let b64 = base64;
    if (!b64 && uri) {
      try {
        b64 = await readAsStringAsync(uri, {
          encoding: EncodingType.Base64,
        });
      } catch (e) {
        console.log('Scan read file', e);
      }
    }
    if (!b64) {
      Alert.alert('Scan', 'Could not read this image. Try another photo.');
      setPhase('idle');
      return;
    }
    setImageUri(uri);
    setPhase('analyzing');
    setResult(null);
    try {
      const raw = await analyzeFoodImageNutrition(b64, mimeType || 'image/jpeg');
      const parsed = parseMealScanResult(raw);
      setResult(parsed);
      setPhase('results');
    } catch (e) {
      console.log(e);
      Alert.alert('Scan failed', e?.message || 'Try again with a clearer photo of your food.');
      setPhase('idle');
      setImageUri(null);
    }
  }, []);

  const pickFromCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera', 'Camera access is needed to snap your meal.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.75,
      base64: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    await runAnalysis(a.base64, a.mimeType || 'image/jpeg', a.uri);
  }, [runAnalysis]);

  const pickFromLibrary = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Photos', 'Photo library access is needed to choose a meal picture.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.75,
      base64: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    await runAnalysis(a.base64, a.mimeType || 'image/jpeg', a.uri);
  }, [runAnalysis]);

  const resetScan = useCallback(() => {
    setPhase('idle');
    setImageUri(null);
    setResult(null);
  }, []);

  if (phase === 'results' && imageUri && result) {
    return (
      <MealScanResults
        imageUri={imageUri}
        result={result}
        user={user}
        onDismiss={resetScan}
        hideHint={hideFooterHint}
        onHideHint={persistHideHint}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.bg, paddingTop: insets.top + 12 }]}>
      <Text style={[styles.title, { color: t.text }]}>Scan</Text>
      <Text style={[styles.subtitle, { color: t.muted }]}>
        Take or choose a photo of your meal or ingredients. We&apos;ll estimate calories, protein,
        carbs-related nutrients, dish name, ingredients, and whether it fits your diet plan.
      </Text>

      <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
        <View style={[styles.iconBlob, { backgroundColor: t.actionIconTintBg }]}>
          <Ionicons name="scan-outline" size={40} color={isDarkMode ? '#6EE7B7' : '#059669'} />
        </View>
        <Text style={[styles.cardTitle, { color: t.text }]}>How it works</Text>
        <Text style={[styles.cardBody, { color: t.muted }]}>
          Uses on-device photo + AI vision (OpenRouter) to produce estimates. Results are not medical
          advice.
        </Text>
      </View>

      {phase === 'analyzing' ? (
        <View style={[styles.loadingBox, { backgroundColor: t.card, borderColor: t.border }]}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={[styles.loadingText, { color: t.muted }]}>Analyzing your plate…</Text>
        </View>
      ) : (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#111827' }]}
            onPress={pickFromCamera}
            activeOpacity={0.88}
          >
            <Ionicons name="camera" size={22} color="#fff" style={styles.btnIcon} />
            <Text style={styles.primaryBtnText}>Take photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: t.card, borderColor: t.border }]}
            onPress={pickFromLibrary}
            activeOpacity={0.88}
          >
            <Ionicons name="images-outline" size={22} color={t.text} style={styles.btnIcon} />
            <Text style={[styles.secondaryBtnText, { color: t.text }]}>Choose from library</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 22,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 22,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 28,
  },
  iconBlob: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  actions: {
    gap: 14,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 17,
    fontWeight: '700',
  },
  btnIcon: {
    marginRight: 10,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 36,
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
