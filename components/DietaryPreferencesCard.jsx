import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';

import { UserContext } from '../context/UserContext';
import { api } from '../convex/_generated/api';
import { getAppTheme, BLUE_ACCENT } from '../constants/appTheme';

const PRESETS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Keto',
  'Paleo',
  'Mediterranean',
  'Low-Carb',
  'Low-Fat',
];

const GREEN = '#22C55E';

export default function DietaryPreferencesCard() {
  const { user, setUser, isDarkMode } = useContext(UserContext);
  const t = getAppTheme(isDarkMode);
  const updateDiet = useMutation(api.users.updateDietaryPreferences);

  const [restrictions, setRestrictions] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [customRestriction, setCustomRestriction] = useState('');
  const [allergyDraft, setAllergyDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRestrictions(
      Array.isArray(user?.dietaryRestrictions) ? [...user.dietaryRestrictions] : []
    );
    setAllergies(Array.isArray(user?.allergies) ? [...user.allergies] : []);
  }, [user?._id, user?.dietaryRestrictions, user?.allergies]);

  const togglePreset = (label) => {
    setRestrictions((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]
    );
  };

  const addCustomRestriction = () => {
    const s = customRestriction.trim();
    if (!s) return;
    const exists = restrictions.some((r) => r.toLowerCase() === s.toLowerCase());
    if (!exists) setRestrictions((prev) => [...prev, s]);
    setCustomRestriction('');
  };

  const removeRestriction = (label) => {
    setRestrictions((prev) => prev.filter((x) => x !== label));
  };

  const addAllergy = () => {
    const s = allergyDraft.trim();
    if (!s) return;
    const exists = allergies.some((a) => a.toLowerCase() === s.toLowerCase());
    if (!exists) setAllergies((prev) => [...prev, s]);
    setAllergyDraft('');
  };

  const removeAllergy = (label) => {
    setAllergies((prev) => prev.filter((x) => x !== label));
  };

  const onSave = async () => {
    if (!user?._id) return;
    setSaving(true);
    try {
      const dietaryRestrictions = [
        ...new Set(restrictions.map((x) => String(x).trim()).filter(Boolean)),
      ];
      const allergyList = [
        ...new Set(allergies.map((x) => String(x).trim()).filter(Boolean)),
      ];
      await updateDiet({
        uid: user._id,
        dietaryRestrictions,
        allergies: allergyList,
      });
      setUser((prev) => ({
        ...prev,
        dietaryRestrictions,
        allergies: allergyList,
      }));
      Alert.alert('Saved', 'Dietary preferences updated.');
    } catch (e) {
      console.log(e);
      Alert.alert('Error', 'Could not save dietary preferences.');
    } finally {
      setSaving(false);
    }
  };

  const customOnlyRestrictions = restrictions.filter((r) => !PRESETS.includes(r));

  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
      <Text style={[styles.title, { color: t.text }]}>Dietary preferences</Text>
      <Text style={[styles.sub, { color: t.muted }]}>
        Let us know about any dietary restrictions or allergies. These are used for AI meal ideas.
      </Text>

      <Text style={[styles.sectionLabel, { color: t.text }]}>Dietary restrictions</Text>
      <View style={styles.presetGrid}>
        {PRESETS.map((label) => {
          const on = restrictions.includes(label);
          return (
            <TouchableOpacity
              key={label}
              style={[
                styles.presetPill,
                {
                  backgroundColor: t.card,
                  borderColor: on ? GREEN : t.border,
                },
              ]}
              onPress={() => togglePreset(label)}
              activeOpacity={0.85}
            >
              <Ionicons
                name={on ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={on ? GREEN : t.muted}
              />
              <Text style={[styles.presetText, { color: t.text }]} numberOfLines={1}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={[
            styles.input,
            { color: t.text, borderColor: t.border, backgroundColor: t.bg },
          ]}
          placeholder="Add custom restriction"
          placeholderTextColor={t.muted}
          value={customRestriction}
          onChangeText={setCustomRestriction}
          onSubmitEditing={addCustomRestriction}
        />
        <TouchableOpacity style={styles.addBtn} onPress={addCustomRestriction}>
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {customOnlyRestrictions.length > 0 ? (
        <View style={styles.tagWrap}>
          {customOnlyRestrictions.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[styles.tag, { borderColor: t.border, backgroundColor: t.bg }]}
              onPress={() => removeRestriction(tag)}
            >
              <Text style={[styles.tagText, { color: t.text }]} numberOfLines={1}>
                {tag}
              </Text>
              <Ionicons name="close-circle" size={18} color={t.muted} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <Text style={[styles.sectionLabel, { color: t.text, marginTop: 18 }]}>Allergies</Text>
      <View style={styles.addRow}>
        <TextInput
          style={[
            styles.input,
            { color: t.text, borderColor: t.border, backgroundColor: t.bg },
          ]}
          placeholder="Add allergy"
          placeholderTextColor={t.muted}
          value={allergyDraft}
          onChangeText={setAllergyDraft}
          onSubmitEditing={addAllergy}
        />
        <TouchableOpacity style={styles.addBtn} onPress={addAllergy}>
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {allergies.length > 0 ? (
        <View style={styles.tagWrap}>
          {allergies.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[styles.tag, { borderColor: t.border, backgroundColor: t.bg }]}
              onPress={() => removeAllergy(tag)}
            >
              <Text style={[styles.tagText, { color: t.text }]} numberOfLines={1}>
                {tag}
              </Text>
              <Ionicons name="close-circle" size={18} color={t.muted} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={onSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Save dietary preferences</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 6 },
  sub: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  sectionLabel: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  presetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1,
    width: '48%',
  },
  presetText: { flex: 1, fontSize: 13, fontWeight: '600' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: '100%',
  },
  tagText: { fontSize: 13, fontWeight: '600', maxWidth: 220 },
  saveBtn: {
    marginTop: 20,
    backgroundColor: BLUE_ACCENT,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
