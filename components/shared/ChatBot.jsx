import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import moment from 'moment';
import { api } from '../../convex/_generated/api';
import { UserContext } from '../../context/UserContext';
import { getAppTheme } from '../../constants/appTheme';
import {
  ChatWithRecipeAI,
  GenerateRecipeImage,
  GenerateRecipeOptions as GenerateRecipeModel,
  PEXELS_FALLBACK_IMAGE,
} from '../../services/AiModel';
import Prompt from '../../Shared/Prompt';

export default function ChatBot() {
  const { user, isDarkMode } = React.useContext(UserContext);
  const t = getAppTheme(isDarkMode);
  const saveRecipeMutation = useMutation(api.recipes.saveRecipe);
  const createMealPlanMutation = useMutation(api.mealPlan.CreateMealPlan);

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedRecipeForMeal, setSelectedRecipeForMeal] = useState(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Persistence Logic
  const STORAGE_KEY = 'DIET_ASSISTANT_MESSAGES';
  const TIMESTAMP_KEY = 'DIET_ASSISTANT_TIMESTAMP';

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    saveMessages();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const savedMessages = await AsyncStorage.getItem(STORAGE_KEY);
      const savedTimestamp = await AsyncStorage.getItem(TIMESTAMP_KEY);

      if (savedMessages && savedTimestamp) {
        const now = Date.now();
        const duration = now - parseInt(savedTimestamp);
        const twentyFourHours = 24 * 60 * 60 * 1000;

        if (duration < twentyFourHours) {
          setMessages(JSON.parse(savedMessages));
        } else {
          // Reset if expired
          const initialMessages = [{ role: 'assistant', content: 'Hello! I am your AI diet assistant. How can I help you today? ✨' }];
          setMessages(initialMessages);
          await AsyncStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
        }
      } else {
        const initialMessages = [{ role: 'assistant', content: 'Hello! I am your AI diet assistant. How can I help you today? ✨' }];
        setMessages(initialMessages);
        await AsyncStorage.setItem(TIMESTAMP_KEY, Date.now().toString());
      }
    } catch (e) {
      console.log('Error loading messages:', e);
    }
  };

  const saveMessages = async () => {
    try {
      if (messages.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      }
    } catch (e) {
      console.log('Error saving messages:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollViewRef = useRef(null);

  const handleScroll = (event) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
    setShowScrollButton(!isAtBottom);
  };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
    setShowScrollButton(false);
  };

  const cleanMessageContent = (content) => {
    return content.replace(/\{"suggested_recipes":\s*\[.*\]\}/g, '').trim();
  };

  const renderRecipeSuggestions = (msg) => {
    if (msg.role !== 'assistant') return null;
    const jsonMatch = msg.content.match(/\{"suggested_recipes":\s*\[.*\]\}/);
    if (!jsonMatch) return null;

    try {
      const { suggested_recipes } = JSON.parse(jsonMatch[0]);
      return (
        <View style={[styles.suggestionsWrapper, { borderTopColor: t.border }]}>
          <Text style={[styles.suggestionTitle, { color: t.muted }]}>Add to your meal plan?</Text>
          <View style={{ gap: 8 }}>
            {suggested_recipes.map((recipeName, i) => (
              <TouchableOpacity 
                key={i} 
                style={[
                  styles.suggestionChipVertical,
                  {
                    backgroundColor: isDarkMode ? '#312E81' : '#F5F3FF',
                    borderColor: isDarkMode ? '#5B21B6' : '#DDD6FE',
                  },
                ]}
                onPress={() => setSelectedRecipeForMeal(recipeName)}
              >
                <Ionicons name="add-circle" size={18} color="#6C63FF" />
                <Text style={[styles.suggestionChipText, { color: isDarkMode ? '#E9D5FF' : '#5B21B6' }]}>{recipeName}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    } catch (e) {
      return null;
    }
  };

  const addToMealPlan = async (recipeName, mealType) => {
    if (!user?._id) return;
    setActionLoading(true);

    try {
      // 1. Generate full recipe object for the name
      const PROMPT = Prompt.RecipeGeneratorOption.replace('{INPUT}', `Generate full details for ${recipeName}`);
      const aiResponse = await GenerateRecipeModel(PROMPT, { maxTokens: 6144 });
      
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not generate recipe data");
      
      const JSONContent = JSON.parse(jsonMatch[0]);
      const recipeData = JSONContent.recipes[0];

      let imageUrl = PEXELS_FALLBACK_IMAGE;
      try {
        const fromPexels = await GenerateRecipeImage(
          recipeData.recipeName,
          recipeData.description || ''
        );
        if (fromPexels && String(fromPexels).trim()) {
          imageUrl = String(fromPexels).trim();
        }
      } catch (e) {
        console.log('ChatBot: recipe image', e?.message || e);
      }
      const recipeWithImage = { ...recipeData, imageUrl };

      // 2. Save recipe to Convex
      const recipeId = await saveRecipeMutation({
        userId: user._id,
        recipeName: recipeData.recipeName,
        imageUrl,
        jsonData: recipeWithImage,
      });

      // 3. Create meal plan entry
      await createMealPlanMutation({
        recipeId,
        date: moment().format('DD/MM/YYYY'),
        mealType,
        userId: user._id
      });

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `✅ Successfully added **${recipeName}** to your **${mealType}** plan for today!` 
      }]);
      setSelectedRecipeForMeal(null);
    } catch (error) {
      console.log('Error adding to meal plan:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't add that recipe to your plan right now." }]);
    } finally {
      setActionLoading(false);
    }
  };

  const onSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await ChatWithRecipeAI([...messages, userMessage]);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I'm having trouble connecting. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {isOpen && (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
          style={styles.keyboardAvoidingContainer}
        >
          <Animated.View style={[
            styles.chatWindow,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              backgroundColor: t.card,
              borderColor: t.border,
            },
          ]}>
            <View style={styles.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="sparkles" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.headerTitle}>AI Personal Assistant</Text>
              </View>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Ionicons name="close-circle" size={26} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }}>
              <ScrollView 
                style={[styles.messagesContainer, { backgroundColor: t.chatMessagesBg }]}
                contentContainerStyle={{ padding: 15 }}
                ref={scrollViewRef}
                showsVerticalScrollIndicator={true}
                persistentScrollbar={true}
                onContentSizeChange={() => !showScrollButton && scrollViewRef.current?.scrollToEnd({ animated: true })}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                {messages.map((msg, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.messageRow,
                      msg.role === 'user' ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' }
                    ]}
                  >
                    <View style={[
                      styles.avatar,
                      msg.role === 'user' ? { marginLeft: 8, backgroundColor: '#A78BFA' } : { marginRight: 8, backgroundColor: '#6C63FF' }
                    ]}>
                      <Ionicons 
                        name={msg.role === 'user' ? "person" : "hardware-chip"} 
                        size={14} 
                        color="#fff" 
                      />
                    </View>
                    <View 
                      style={[
                        styles.messageBubble, 
                        msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
                        msg.role !== 'user' && {
                          backgroundColor: t.assistantBubbleBg,
                          borderColor: t.border,
                        },
                      ]}
                    >
                      <Text style={[
                        styles.messageText,
                        msg.role === 'user' ? styles.userText : styles.assistantText,
                        msg.role !== 'user' && { color: t.assistantText },
                      ]}>
                        {cleanMessageContent(msg.content)}
                      </Text>
                      {renderRecipeSuggestions(msg)}
                    </View>
                  </View>
                ))}
                {loading && (
                  <View style={styles.messageRow}>
                    <View style={[styles.avatar, { marginRight: 8, backgroundColor: '#6C63FF' }]}>
                      <Ionicons name="hardware-chip" size={14} color="#fff" />
                    </View>
                    <View style={[styles.messageBubble, styles.assistantBubble, { paddingVertical: 15, backgroundColor: t.assistantBubbleBg, borderColor: t.border }]}>
                      <ActivityIndicator size="small" color="#6C63FF" />
                    </View>
                  </View>
                )}
                {selectedRecipeForMeal && (
                  <View style={[styles.mealTypeContainer, { backgroundColor: t.card, borderColor: '#6C63FF' }]}>
                    <Text style={[styles.mealTypeTitle, { color: t.text }]}>Select Meal Type for {selectedRecipeForMeal}:</Text>
                    <View style={styles.mealTypeButtons}>
                      {['Breakfast', 'Lunch', 'Dinner'].map(type => (
                        <TouchableOpacity 
                          key={type} 
                          style={styles.mealTypeButton}
                          onPress={() => addToMealPlan(selectedRecipeForMeal, type)}
                          disabled={actionLoading}
                        >
                          {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.mealTypeButtonText}>{type}</Text>}
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity onPress={() => setSelectedRecipeForMeal(null)} style={{ marginTop: 10 }}>
                      <Text style={{ color: '#EF4444', fontSize: 12 }}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>

              {showScrollButton && (
                <TouchableOpacity 
                  style={styles.scrollToBottomButton} 
                  onPress={scrollToBottom}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-down" size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles.inputArea, { backgroundColor: t.card, borderTopColor: t.border }]}>
              <TextInput
                style={[styles.input, { backgroundColor: t.inputBg, color: t.text }]}
                placeholder="Ask me anything..."
                placeholderTextColor="#9CA3AF"
                value={input}
                onChangeText={setInput}
                multiline
              />
              <TouchableOpacity style={styles.sendButton} onPress={onSend}>
                <Ionicons name="arrow-up" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      )}

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.8}
      >
        <Ionicons name={isOpen ? "close" : "chatbubble-ellipses"} size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    pointerEvents: 'box-none', // crucial: allows touches to pass through empty space
    zIndex: 1000,
  },
  keyboardAvoidingContainer: {
    position: 'absolute',
    bottom: 100, // Aligned with FAB
    right: 20,
    width: 320,
    height: 480,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 65,
    height: 65,
    borderRadius: 33,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  chatWindow: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 75, // Space for FAB
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  header: {
    backgroundColor: '#6C63FF',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  messageRow: {
    marginBottom: 15,
    alignItems: 'flex-end',
    width: '100%',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    maxWidth: '80%',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  userBubble: {
    backgroundColor: '#6C63FF',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  userText: {
    color: '#fff',
    fontWeight: '600',
  },
  assistantText: {
    color: '#1F2937',
    fontWeight: '500',
  },
  suggestionsWrapper: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    width: '100%',
  },
  suggestionTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  suggestionChipVertical: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    width: '100%',
  },
  suggestionChipText: {
    color: '#5B21B6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  mealTypeContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#6C63FF',
    alignItems: 'center',
    elevation: 3,
  },
  mealTypeTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#374151',
  },
  mealTypeButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  mealTypeButton: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
  },
  mealTypeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  inputArea: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
  },
  scrollToBottomButton: {
    position: 'absolute',
    bottom: 10,
    right: 15,
    backgroundColor: '#6C63FF',
    width: 35,
    height: 35,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  input: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#6C63FF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
