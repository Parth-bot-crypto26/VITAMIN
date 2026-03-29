import 'react-native-gesture-handler';
import React, { useState, useContext, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StatusBar, Modal, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Menu, LogOut, X, Send, Bell, Bot, Palette, Check } from 'lucide-react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, runOnJS,
  withSequence, withRepeat, withSpring
} from 'react-native-reanimated';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';

import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import GoalsScreen from './screens/GoalsScreen';
import EventsScreen from './screens/EventsScreen';
import BuddyScreen from './screens/BuddyScreen';
import VTOPSyncScreen from './screens/VTOPSyncScreen';
import ChatScreen from './screens/ChatScreen';

import { AppProvider, AppContext, THEMES } from './context/AppContext';

const StyledView = styled(View);
const StyledText = styled(Text);
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <SafeAreaProvider>
          <NavigationContainer>
            <MainNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </AppProvider>
    </GestureHandlerRootView>
  );
}

function MainNavigator() {
  const { currentUser, themeMode, theme } = useContext(AppContext);
  return (
    <>
      <StatusBar barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'} backgroundColor={theme?.bg || '#09090b'} />
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!currentUser ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainLayout} />
            <Stack.Screen name="VTOPSync" component={VTOPSyncScreen} options={{ presentation: 'modal' }} />
          </>
        )}
      </Stack.Navigator>
    </>
  );
}

// ── MAIN LAYOUT ─────────────────────────────────────────────────────────────
function MainLayout() {
  const { currentUser, logout, theme, themeMode, setTheme, notificationPulse, unreadCount, clearUnread } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('Home');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isCocoOpen, setCocoOpen] = useState(false);
  const [isNotifOpen, setNotifOpen] = useState(false);
  const [isThemePicker, setThemePicker] = useState(false);

  const offset = useSharedValue(-320);
  const bellRotation = useSharedValue(0);
  const bellScale = useSharedValue(1);

  // Ring bell whenever new notification pulse
  useEffect(() => {
    if (notificationPulse > 0) {
      bellRotation.value = withSequence(
        withRepeat(withSequence(withTiming(-18, { duration: 60 }), withTiming(18, { duration: 60 })), 5, true),
        withTiming(0, { duration: 80 })
      );
      bellScale.value = withSequence(withSpring(1.3), withSpring(1));
    }
  }, [notificationPulse]);

  const bellAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${bellRotation.value}deg` }, { scale: bellScale.value }],
  }));

  const toggleSidebar = () => {
    const isOpen = !isSidebarOpen;
    setSidebarOpen(isOpen);
    offset.value = withTiming(isOpen ? 0 : -320, { duration: 300 });
  };
  const animatedSidebarStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  const handleSwipeOpen = () => { if (!isSidebarOpen) toggleSidebar(); };
  const handleSwipeClose = () => { if (isSidebarOpen) toggleSidebar(); };

  const openGesture = Gesture.Pan().activeOffsetX(20).onEnd(e => { if (e.translationX > 50) runOnJS(handleSwipeOpen)(); });
  const closeGesture = Gesture.Pan().activeOffsetX(-20).onEnd(e => { if (e.translationX < -50) runOnJS(handleSwipeClose)(); });

  // Draggable Coco bot
  const botX = useSharedValue(0);
  const botY = useSharedValue(0);
  const botCtxX = useSharedValue(0);
  const botCtxY = useSharedValue(0);
  const botGesture = Gesture.Pan()
    .onUpdate(e => { botX.value = botCtxX.value + e.translationX; botY.value = botCtxY.value + e.translationY; })
    .onEnd(() => { botCtxX.value = botX.value; botCtxY.value = botY.value; });
  const animatedBotStyle = useAnimatedStyle(() => ({ transform: [{ translateX: botX.value }, { translateY: botY.value }] }));

  const renderScreen = () => {
    switch (activeTab) {
      case 'Home': return <HomeScreen />;
      case 'Goals': return <GoalsScreen />;
      case 'Events': return <EventsScreen />;
      case 'Buddy': return <BuddyScreen />;
      case 'Chat': return <ChatScreen />;
      default: return <HomeScreen />;
    }
  };

  return (
    <SafeAreaView className="flex-1 relative" style={{ backgroundColor: theme.bg }}>

      {/* HEADER */}
      <StyledView className="flex-row justify-between items-center px-5 py-3 z-10 border-b"
        style={{ backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadowColor, shadowOpacity: theme.shadowOp, shadowRadius: 8, elevation: theme.elevation }}>
        <TouchableOpacity onPress={toggleSidebar} className="p-2 rounded-full border"
          style={{ backgroundColor: theme.bg, borderColor: theme.border }}>
          <Menu color={theme.icon} size={22} />
        </TouchableOpacity>

        <Image source={require('./assets/images/logo.png')} style={{ height: 30, width: 30 }} resizeMode="contain" />

        <StyledView className="flex-row items-center space-x-2">
          {/* THEME PICKER BUTTON */}
          <TouchableOpacity onPress={() => setThemePicker(true)} className="p-2 rounded-full border"
            style={{ backgroundColor: theme.bg, borderColor: theme.border }}>
            <Palette color={theme.icon} size={20} />
          </TouchableOpacity>

          {/* BELL */}
          <TouchableOpacity onPress={() => { setNotifOpen(true); clearUnread(); }} className="p-2 rounded-full border relative"
            style={{ backgroundColor: theme.bg, borderColor: theme.border }}>
            <Animated.View style={bellAnimatedStyle}>
              <Bell color={theme.icon} size={20} />
            </Animated.View>
            {unreadCount > 0 && (
              <View className="absolute top-1 right-1 h-4 w-4 rounded-full items-center justify-center z-10" style={{ backgroundColor: '#EF4444' }}>
                <Text className="text-[9px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </StyledView>
      </StyledView>

      {/* SCREEN CONTENT */}
      <StyledView className="flex-1">
        {renderScreen()}
      </StyledView>

      {/* SWIPE ZONE */}
      {!isSidebarOpen && (
        <GestureDetector gesture={openGesture}>
          <Animated.View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 22, zIndex: 15 }} />
        </GestureDetector>
      )}

      {/* FLOATING COCO BOT */}
      {activeTab !== 'Buddy' && (
        <GestureDetector gesture={botGesture}>
          <Animated.View style={[animatedBotStyle, { position: 'absolute', bottom: 32, right: 20, zIndex: 20 }]}>
            <TouchableOpacity onPress={() => setCocoOpen(true)}
              className="h-16 w-16 rounded-full items-center justify-center shadow-2xl"
              style={{ backgroundColor: theme.primary }} activeOpacity={0.88}>
              <Bot color="white" size={28} />
            </TouchableOpacity>
          </Animated.View>
        </GestureDetector>
      )}

      {/* SIDEBAR OVERLAY */}
      {isSidebarOpen && <TouchableOpacity activeOpacity={1} onPress={toggleSidebar} className="absolute inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} />}

      {/* SIDEBAR */}
      <GestureDetector gesture={closeGesture}>
        <Animated.View style={[animatedSidebarStyle, { backgroundColor: theme.surface, borderColor: theme.border }]}
          className="absolute top-0 bottom-0 left-0 w-[78%] z-50 shadow-2xl border-r p-6 pt-14">
          <StyledView className="mb-8">
            <StyledText className="text-3xl font-black tracking-tight" style={{ color: theme.text }}>
              VIT<StyledText style={{ color: theme.primary }}>amin</StyledText>
            </StyledText>
            <StyledText className="text-sm mt-1 font-medium" style={{ color: theme.textLight }}>
              Hey, {currentUser?.name?.split(' ')[0]} 👋
            </StyledText>
          </StyledView>

          <StyledView className="space-y-1">
            {['Home', 'Goals', 'Events', 'Buddy', 'Chat'].map(tab => (
              <SidebarItem key={tab} label={tab} active={activeTab === tab}
                onPress={() => { setActiveTab(tab); toggleSidebar(); }} theme={theme} />
            ))}
          </StyledView>

          <View className="absolute bottom-10 left-6 right-6">
            {/* Current theme indicator */}
            <TouchableOpacity onPress={() => { setThemePicker(true); toggleSidebar(); }}
              className="flex-row items-center p-3 rounded-2xl border mb-3"
              style={{ backgroundColor: theme.bg, borderColor: theme.border }}>
              <View className="h-5 w-5 rounded-full mr-3" style={{ backgroundColor: theme.primary }} />
              <Text className="font-semibold text-sm flex-1" style={{ color: theme.textLight }}>Theme: {THEMES[themeMode]?.name}</Text>
              <Palette size={16} color={theme.textLight} />
            </TouchableOpacity>

            <TouchableOpacity onPress={logout} className="flex-row items-center p-3 rounded-2xl"
              style={{ backgroundColor: '#FEE2E2' }}>
              <LogOut size={18} color="#EF4444" />
              <Text className="text-red-500 font-bold ml-3">Logout</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </GestureDetector>

      {/* COCO BOT MODAL */}
      <Modal visible={isCocoOpen} animationType="slide" transparent onRequestClose={() => setCocoOpen(false)}>
        <CocoBot onClose={() => setCocoOpen(false)} user={currentUser} theme={theme} />
      </Modal>

      {/* NOTIFICATION MODAL */}
      <Modal visible={isNotifOpen} animationType="fade" transparent onRequestClose={() => setNotifOpen(false)}>
        <NotificationPopup onClose={() => setNotifOpen(false)} theme={theme} />
      </Modal>

      {/* THEME PICKER MODAL */}
      <Modal visible={isThemePicker} animationType="slide" transparent onRequestClose={() => setThemePicker(false)}>
        <ThemePicker onClose={() => setThemePicker(false)} theme={theme} themeMode={themeMode} setTheme={setTheme} />
      </Modal>
    </SafeAreaView>
  );
}

// ── SIDEBAR ITEM ─────────────────────────────────────────────────────────────
const SidebarItem = ({ label, active, onPress, theme }) => (
  <TouchableOpacity onPress={onPress} className="flex-row items-center p-4 rounded-2xl"
    style={{ backgroundColor: active ? `${theme.primary}20` : 'transparent' }}>
    <StyledText className="font-bold text-lg" style={{ color: active ? theme.primary : theme.textLight }}>{label}</StyledText>
  </TouchableOpacity>
);

// ── THEME PICKER ─────────────────────────────────────────────────────────────
function ThemePicker({ onClose, theme, themeMode, setTheme }) {
  return (
    <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <TouchableOpacity className="flex-1" onPress={onClose} />
      <View className="rounded-t-[36px] px-6 pt-6 pb-10" style={{ backgroundColor: theme.surface }}>
        <View className="flex-row justify-between items-center mb-5">
          <Text className="text-xl font-black" style={{ color: theme.text }}>Choose Theme</Text>
          <TouchableOpacity onPress={onClose} className="p-2 rounded-full" style={{ backgroundColor: theme.bg }}>
            <X size={22} color={theme.icon} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
          <View className="flex-row flex-wrap justify-between">
            {Object.entries(THEMES).map(([key, t]) => {
              const isActive = themeMode === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => { setTheme(key); onClose(); }}
                  className="w-[48%] mb-3 p-4 rounded-2xl border"
                  style={{
                    backgroundColor: t.bg,
                    borderColor: isActive ? t.primary : t.border,
                    borderWidth: isActive ? 2 : 1,
                  }}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="h-6 w-6 rounded-full" style={{ backgroundColor: t.primary }} />
                    {isActive && <Check size={14} color={t.primary} />}
                  </View>
                  <Text className="font-bold text-sm" style={{ color: t.text }} numberOfLines={1}>{t.name}</Text>
                  <View className="flex-row mt-2 space-x-1">
                    {[t.bg, t.surface, t.primary, t.textLight].map((c, i) => (
                      <View key={i} className="h-3 w-3 rounded-full border" style={{ backgroundColor: c, borderColor: t.border }} />
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

// ── NOTIFICATION POPUP ───────────────────────────────────────────────────────
function NotificationPopup({ onClose, theme }) {
  return (
    <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <View className="w-full rounded-3xl p-6 shadow-2xl" style={{ backgroundColor: theme.surface }}>
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-xl font-black" style={{ color: theme.text }}>Notifications</Text>
          <TouchableOpacity onPress={onClose}><X color={theme.icon} size={24} /></TouchableOpacity>
        </View>
        <View className="space-y-3">
          <NotifItem title="📚 Class Reminder" desc="Data Mining lab starts in 15 mins — AB02-423." time="Now" theme={theme} />
          <NotifItem title="🔥 Streak Alert" desc="You have a 3-day goal streak! Don't break it." time="1h ago" theme={theme} />
          <NotifItem title="🤖 Coco Bot" desc="Your weekly study plan is ready. Check it out!" time="3h ago" theme={theme} />
          <NotifItem title="🏆 Event" desc="HackBhopal 3.0 registration is open today." time="5h ago" theme={theme} />
        </View>
      </View>
    </View>
  );
}

const NotifItem = ({ title, desc, time, theme }) => (
  <View className="flex-row items-start border-b pb-3" style={{ borderColor: theme.border }}>
    <View className="flex-1">
      <Text className="font-bold text-sm" style={{ color: theme.text }}>{title}</Text>
      <Text className="text-xs mt-0.5 leading-4" style={{ color: theme.textLight }}>{desc}</Text>
    </View>
    <Text className="text-[10px] ml-3 mt-0.5" style={{ color: theme.textLight }}>{time}</Text>
  </View>
);

// ── INLINE COCOBOT (floating modal) ──────────────────────────────────────────
function CocoBot({ onClose, user, theme }) {
  const { API_URL, authToken } = useContext(AppContext);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: `Hi ${user?.name?.split(' ')[0] || 'there'}! 👋 I know your schedule, attendance & grades. Ask me anything!`, actions: [] }
  ]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100); }, [messages.length]);

  const handleAsk = async () => {
    const q = query.trim();
    if (!q || loading) return;
    setQuery('');
    setLoading(true);

    const chatHistory = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.text }));

    setMessages(prev => [...prev, { role: 'user', text: q, actions: [] }]);

    try {
      const res = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ message: q, history: chatHistory }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply, actions: data.actions || [] }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${data.detail || 'Something went wrong'}`, actions: [] }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', text: "Couldn't reach server. Is the backend running?", actions: [] }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
      <View className="h-[72%] rounded-t-[40px] p-6 shadow-2xl" style={{ backgroundColor: theme.surface }}>
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center">
            <View className="h-10 w-10 rounded-full items-center justify-center mr-2" style={{ backgroundColor: `${theme.primary}20` }}>
              <Bot size={20} color={theme.primary} />
            </View>
            <View>
              <Text className="font-black text-lg" style={{ color: theme.text }}>Coco AI</Text>
              <Text className="text-xs font-semibold" style={{ color: theme.primary }}>Your Study Buddy</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} className="p-2 rounded-full" style={{ backgroundColor: theme.bg }}>
            <X color={theme.icon} size={22} />
          </TouchableOpacity>
        </View>

        <ScrollView ref={scrollRef} className="flex-1 mb-4" showsVerticalScrollIndicator={false}>
          {messages.map((m, i) => (
            <View key={i} className={`mb-3 max-w-[85%] ${m.role === 'user' ? 'self-end' : 'self-start'}`}>
              <View className={`p-3 rounded-2xl ${m.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm border'}`}
                style={{ backgroundColor: m.role === 'user' ? theme.primary : theme.bg, borderColor: theme.border }}>
                <Text className="text-sm leading-5" style={{ color: m.role === 'user' ? 'white' : theme.text }}>{m.text}</Text>
              </View>
              {m.actions?.map((action, ai) => (
                <View key={ai} className="flex-row items-center mt-1 ml-1">
                  <View className="h-2 w-2 rounded-full mr-2" style={{ backgroundColor: '#10B981' }} />
                  <Text className="text-xs" style={{ color: '#10B981' }}>{action}</Text>
                </View>
              ))}
            </View>
          ))}
          {loading && (
            <View className="self-start mb-3 p-3 rounded-2xl rounded-tl-sm border flex-row items-center"
              style={{ backgroundColor: theme.bg, borderColor: theme.border }}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text className="text-sm ml-2" style={{ color: theme.textLight }}>Thinking...</Text>
            </View>
          )}
        </ScrollView>

        <View className="flex-row items-center rounded-full px-3 border h-14"
          style={{ backgroundColor: theme.bg, borderColor: theme.border }}>
          <TextInput
            value={query} onChangeText={setQuery} placeholder="Ask Coco..."
            placeholderTextColor={theme.textLight} className="flex-1 p-4"
            style={{ color: theme.text }} onSubmitEditing={handleAsk} returnKeyType="send"
          />
          <TouchableOpacity onPress={handleAsk} disabled={!query.trim() || loading}
            className="h-10 w-10 rounded-full items-center justify-center"
            style={{ backgroundColor: (!query.trim() || loading) ? `${theme.primary}50` : theme.primary }}>
            <Send size={18} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}