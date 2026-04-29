import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import { UserContext } from '../context/UserContext';
import { getAppTheme } from '../constants/appTheme';

const MEAL_TYPES = [
  { id: 1, name: 'Breakfast', icon: 'cafe-outline' },
  { id: 2, name: 'Lunch', icon: 'sunny-outline' },
  { id: 3, name: 'Snacks', icon: 'nutrition-outline' },
  { id: 4, name: 'Dinner', icon: 'moon-outline' },
];

export default function AddToMealActionSheet({
  onSave,
  onClose,
  initialMealType,
  initialDate,
  lockMealType,
}) {
  const { isDarkMode } = useContext(UserContext);
  const t = getAppTheme(isDarkMode);

  const [dateList, setDateList] = useState([]);
  const [selectedDate, setSelectedDate] = useState(initialDate ?? null);
  const [selectedMeal, setSelectedMeal] = useState(initialMealType ?? null);

  useEffect(() => {
    generateDates();
  }, []);

  useEffect(() => {
    if (initialDate) setSelectedDate(initialDate);
  }, [initialDate]);

  useEffect(() => {
    if (initialMealType) setSelectedMeal(initialMealType);
  }, [initialMealType]);

  const generateDates = () => {
    const dates = [];
    for (let i = 0; i < 4; i++) {
        const dateObj = moment().add(i, 'days');
        dates.push({
            id: i,
            day: i === 0 ? 'TODAY' : dateObj.format('ddd').toUpperCase(),
            date: dateObj.format('DD'),
            month: dateObj.format('MMM'),
            fullDate: dateObj.format('DD/MM/YYYY')
        });
    }
    setDateList(dates);
    setSelectedDate(dates[0].fullDate);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.content, { backgroundColor: t.card }]}>
        <View style={styles.header}>
            <Text style={[styles.title, { color: t.text }]}>Add to Meal Plan</Text>
            <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={t.muted} />
            </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: t.muted }]}>Select Date</Text>
        <FlatList
          data={dateList}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedDate(item.fullDate)}
              style={[
                styles.dateCard,
                { backgroundColor: t.card, borderColor: t.border },
                selectedDate === item.fullDate && [
                  styles.selectedCard,
                  isDarkMode && { backgroundColor: '#312E81' },
                ],
              ]}
            >
              <Text style={[styles.dayText, { color: t.muted }, selectedDate === item.fullDate && styles.selectedText]}>{item.day}</Text>
              <Text style={[styles.dateText, { color: t.text }, selectedDate === item.fullDate && styles.selectedText]}>{item.date}</Text>
              <Text style={[styles.monthText, { color: t.muted }, selectedDate === item.fullDate && styles.selectedText]}>{item.month}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listPadding}
        />

        {!(lockMealType && initialMealType) && (
          <>
            <Text style={[styles.sectionTitle, { color: t.muted }]}>Select Meal</Text>
            <View style={styles.mealContainer}>
              {MEAL_TYPES.map((meal) => (
                <TouchableOpacity
                  key={meal.id}
                  onPress={() => setSelectedMeal(meal.name)}
                  style={[
                    styles.mealCard,
                    { backgroundColor: t.card, borderColor: t.border },
                    selectedMeal === meal.name && [
                      styles.selectedCard,
                      isDarkMode && { backgroundColor: '#312E81' },
                    ],
                  ]}
                >
                  <Ionicons 
                    name={meal.icon} 
                    size={24} 
                    color={selectedMeal === meal.name ? '#6C63FF' : t.muted} 
                  />
                  <Text style={[styles.mealText, { color: t.muted }, selectedMeal === meal.name && styles.selectedText]}>{meal.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity 
          onPress={() => onSave(selectedDate, selectedMeal)}
          style={styles.saveButton}
          disabled={!selectedDate || !selectedMeal}
        >
          <Text style={styles.saveButtonText}>Add to Meal Plan</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onClose} style={[styles.cancelButton, { borderColor: t.border }]}>
          <Text style={[styles.cancelButtonText, { color: t.muted }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    height: '100%',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 10,
  },
  dateCard: {
    width: 80,
    height: 100,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mealCard: {
    width: '48%',
    height: 90,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedCard: {
    borderColor: '#6C63FF',
    backgroundColor: '#F5F3FF',
    borderWidth: 2,
  },
  dayText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  monthText: {
    fontSize: 14,
  },
  mealContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  mealText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  selectedText: {
    color: '#6C63FF',
  },
  saveButton: {
    backgroundColor: '#6C63FF',
    padding: 16,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 16,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  listPadding: {
    paddingRight: 20,
    paddingBottom: 10,
  }
});
