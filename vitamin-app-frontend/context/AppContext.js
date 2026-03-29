import React, { createContext, useState, useEffect, useRef } from 'react';
import { Alert, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AppContext = createContext();

// ── 13 Premium Themes — iOS-polished feel ─────────────────────────────────────
export const THEMES = {
  light: {
    name: 'Light', bg: '#F2F2F7', surface: '#FFFFFF', text: '#1C1C1E', textLight: '#8E8E93',
    primary: '#FF6B35', border: '#E5E5EA', icon: '#1C1C1E', accent: '#FF6B35',
    radius: 22, borderWidth: 0.5, shadowOp: 0.08, shadowColor: '#000000', elevation: 4,
    cardBg: '#FFFFFF', inputBg: '#F2F2F7',
  },
  dark: {
    name: 'Dark', bg: '#000000', surface: '#1C1C1E', text: '#FFFFFF', textLight: '#8E8E93',
    primary: '#FF6B35', border: '#38383A', icon: '#FFFFFF', accent: '#FF6B35',
    radius: 22, borderWidth: 0.5, shadowOp: 0, shadowColor: 'transparent', elevation: 0,
    cardBg: '#1C1C1E', inputBg: '#2C2C2E',
  },
  dracula: {
    name: '🧛 Dracula', bg: '#282A36', surface: '#1E1F29', text: '#F8F8F2', textLight: '#6272A4',
    primary: '#FF79C6', border: '#44475A', icon: '#BD93F9', accent: '#BD93F9',
    radius: 20, borderWidth: 1, shadowOp: 0.3, shadowColor: '#FF79C6', elevation: 6,
    cardBg: '#323443', inputBg: '#21222C',
  },
  onedark: {
    name: '🌑 One Dark', bg: '#21252B', surface: '#282C34', text: '#ABB2BF', textLight: '#5C6370',
    primary: '#61AFEF', border: '#3E4451', icon: '#ABB2BF', accent: '#E06C75',
    radius: 18, borderWidth: 1, shadowOp: 0.15, shadowColor: '#61AFEF', elevation: 5,
    cardBg: '#2C313C', inputBg: '#1C2026',
  },
  tokyonight: {
    name: '🌃 Tokyo Night', bg: '#1A1B26', surface: '#24283B', text: '#C0CAF5', textLight: '#565F89',
    primary: '#7AA2F7', border: '#414868', icon: '#C0CAF5', accent: '#BB9AF7',
    radius: 20, borderWidth: 1, shadowOp: 0.25, shadowColor: '#7AA2F7', elevation: 7,
    cardBg: '#2A2E45', inputBg: '#13141C',
  },
  nord: {
    name: '🧊 Nord', bg: '#2E3440', surface: '#3B4252', text: '#ECEFF4', textLight: '#4C566A',
    primary: '#88C0D0', border: '#434C5E', icon: '#D8DEE9', accent: '#5E81AC',
    radius: 20, borderWidth: 1, shadowOp: 0.12, shadowColor: '#88C0D0', elevation: 3,
    cardBg: '#3B4252', inputBg: '#2E3440',
  },
  solarized: {
    name: '☀️ Solarized', bg: '#002B36', surface: '#073642', text: '#839496', textLight: '#586E75',
    primary: '#268BD2', border: '#074F61', icon: '#93A1A1', accent: '#2AA198',
    radius: 18, borderWidth: 1, shadowOp: 0.12, shadowColor: '#268BD2', elevation: 3,
    cardBg: '#073642', inputBg: '#00212B',
  },
  gruvbox: {
    name: '🪵 Gruvbox', bg: '#282828', surface: '#3C3836', text: '#EBDBB2', textLight: '#928374',
    primary: '#FABD2F', border: '#504945', icon: '#EBDBB2', accent: '#FE8019',
    radius: 16, borderWidth: 1, shadowOp: 0.12, shadowColor: '#FABD2F', elevation: 3,
    cardBg: '#504945', inputBg: '#1D2021',
  },
  nightowl: {
    name: '🦉 Night Owl', bg: '#011627', surface: '#0D2137', text: '#D6DEEB', textLight: '#5F7E97',
    primary: '#82AAFF', border: '#1D3B53', icon: '#D6DEEB', accent: '#C792EA',
    radius: 20, borderWidth: 1, shadowOp: 0.2, shadowColor: '#82AAFF', elevation: 5,
    cardBg: '#0D2137', inputBg: '#001122',
  },
  synthwave: {
    name: '🎸 SynthWave', bg: '#2B213A', surface: '#1A1033', text: '#FFFFFF', textLight: '#9D87D2',
    primary: '#F92AAD', border: '#4A3D6A', icon: '#FFFFFF', accent: '#7B2FBE',
    radius: 16, borderWidth: 2, shadowOp: 0.5, shadowColor: '#F92AAD', elevation: 10,
    cardBg: '#241A35', inputBg: '#150D25',
  },
  cobalt2: {
    name: '💙 Cobalt2', bg: '#193549', surface: '#0D2537', text: '#FFFFFF', textLight: '#8FB7D4',
    primary: '#FFC600', border: '#1F4B6E', icon: '#FFFFFF', accent: '#FF9D00',
    radius: 18, borderWidth: 1, shadowOp: 0.2, shadowColor: '#FFC600', elevation: 5,
    cardBg: '#1A3A52', inputBg: '#0A1E2D',
  },
  monokai: {
    name: '🟢 Monokai Pro', bg: '#2D2A2E', surface: '#221F22', text: '#FCFCFA', textLight: '#727072',
    primary: '#A9DC76', border: '#403E41', icon: '#FCFCFA', accent: '#FF6188',
    radius: 18, borderWidth: 1, shadowOp: 0.12, shadowColor: '#A9DC76', elevation: 4,
    cardBg: '#2D2A2E', inputBg: '#191719',
  },
  antigravity: {
    name: '🚀 Antigravity', bg: '#0F172A', surface: '#1E293B', text: '#F8FAFC', textLight: '#94A3B8',
    primary: '#A855F7', border: '#334155', icon: '#E2E8F0', accent: '#38BDF8',
    radius: 28, borderWidth: 1, shadowOp: 0.35, shadowColor: '#A855F7', elevation: 10,
    cardBg: '#1E293B', inputBg: '#0F172A',
  },
};

export const AppProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [themeMode, setThemeMode] = useState('dark');
  const [notificationPulse, setNotificationPulse] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [academicCalendar, setAcademicCalendar] = useState([]);

  useEffect(() => {
    AsyncStorage.getItem('vit_theme').then(t => {
      if (t && THEMES[t]) setThemeMode(t);
    }).catch(() => {});
  }, []);

  const triggerBellAnimation = (count = 1) => {
    setNotificationPulse(prev => prev + 1);
    setUnreadCount(prev => prev + count);
    // Vibrate on Android
    Vibration.vibrate([0, 80, 40, 80]);
  };

  const clearUnread = () => setUnreadCount(0);
  const theme = THEMES[themeMode] || THEMES.dark;

  const setTheme = (key) => {
    if (THEMES[key]) {
      setThemeMode(key);
      AsyncStorage.setItem('vit_theme', key).catch(() => {});
    }
  };

  const cycleTheme = () => {
    const keys = Object.keys(THEMES);
    const nextIndex = (keys.indexOf(themeMode) + 1) % keys.length;
    setTheme(keys[nextIndex]);
  };

  const API_URL = "http://10.80.216.54:8000";

  const fetchUserProfile = async (token) => {
    try {
      const [profileRes, tasksRes, schedulesRes, calendarRes] = await Promise.all([
        fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/tasks/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/schedules/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/schedules/calendar`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        const tasksData = tasksRes.ok ? await tasksRes.json() : [];
        const schedulesData = schedulesRes.ok ? await schedulesRes.json() : [];
        const calendarData = calendarRes.ok ? await calendarRes.json() : [];

        // Group goals by category
        const groupedGoals = {};
        (data.goals || []).forEach(g => {
          if (!groupedGoals[g.category]) groupedGoals[g.category] = [];
          groupedGoals[g.category].push(g);
        });

        // Build calendar lookup  {date → event}
        const calMap = {};
        calendarData.forEach(e => { calMap[e.date] = e; });
        setAcademicCalendar(calMap);

        setCurrentUser({
          ...data,
          goals: groupedGoals,
          goalsList: data.goals || [],
          tasks: tasksData || [],
          schedule: schedulesData || [],
          grades: data.grades || [],
        });
      } else {
        Alert.alert("Error", "Failed to fetch user profile");
      }
    } catch (e) {
      Alert.alert("Network Error", "Could not connect to backend");
    }
  };

  const login = async (username, password) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_number: username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setAuthToken(data.access_token);
        fetchUserProfile(data.access_token);
      } else {
        Alert.alert("Login Failed", data.detail || "Invalid credentials");
      }
    } catch (e) {
      Alert.alert("Network Error", "Could not connect to backend");
    }
  };

  const register = async (username, password, name, branch) => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_number: username, password, name, branch }),
      });
      const data = await res.json();
      if (res.ok) {
        setAuthToken(data.access_token);
        fetchUserProfile(data.access_token);
      } else {
        Alert.alert("Registration Failed", data.detail || "Error registering");
      }
    } catch (e) {
      Alert.alert("Network Error", "Could not connect to backend");
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setAuthToken(null);
    setAcademicCalendar([]);
  };

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser, authToken,
      login, register, logout,
      API_URL, fetchUserProfile,
      themeMode, theme, cycleTheme, setTheme,
      notificationPulse, triggerBellAnimation,
      unreadCount, clearUnread,
      academicCalendar,
    }}>
      {children}
    </AppContext.Provider>
  );
};