import React, { useState, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { AppContext } from '../context/AppContext';
import { X, MapPin, Clock, ArrowRight, Zap, Calendar } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const todayDate = new Date();
const formatDate = (offsetDays) => {
  const d = new Date(todayDate);
  d.setDate(todayDate.getDate() + offsetDays);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const CALENDAR_DAYS = Array.from({ length: 14 }).map((_, i) => {
  const d = new Date(todayDate);
  d.setDate(todayDate.getDate() + i);
  return {
    date: d.getDate(),
    label: formatDate(i),
    day: d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(),
    monthStr: d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
    fullDate: d,
  };
});

// Realistic VIT events spread over two weeks
const EVENTS = [
  { title: 'HackBhopal 3.0', type: 'Tech', org: 'IEEE Student Branch', date: formatDate(0), time: '10:00 AM', loc: 'AB2 Block, Main Hall', desc: '24-hour hackathon with prizes worth ₹1,00,000. Open to all VITians.' },
  { title: 'Cultural Fest Kickoff', type: 'Cultural', org: 'SAC', date: formatDate(0), time: '5:00 PM', loc: 'Amphitheatre', desc: 'Opening ceremony of the annual cultural festival.' },
  { title: 'DSA Bootcamp — Day 1', type: 'Workshop', org: 'ACM VIT Bhopal', date: formatDate(1), time: '9:00 AM', loc: 'TT405', desc: 'Arrays, Strings, and Sliding Window problems with live coding.' },
  { title: 'Pitch Perfect — Startup Comp', type: 'Biz', org: 'E-Cell VIT', date: formatDate(1), time: '2:00 PM', loc: 'Seminar Hall, MG2', desc: '2-minute pitches judged by industry mentors. Top 10 get incubation access.' },
  { title: 'Open Mic Night', type: 'Cultural', org: 'Rotaract Club', date: formatDate(2), time: '7:00 PM', loc: 'Food Court Area', desc: 'Performances in poetry, stand-up comedy, and music. Sign up at the entrance.' },
  { title: 'ML Study Group', type: 'Workshop', org: 'GDSC VIT Bhopal', date: formatDate(3), time: '3:00 PM', loc: 'TT305', desc: 'Hands-on session on regression and classification with scikit-learn.' },
  { title: 'Inter-hostel Cricket Tournament', type: 'Sports', org: 'Sports Council', date: formatDate(3), time: '6:00 AM', loc: 'Cricket Ground', desc: 'Knockout format. Register your hostel team by EOD today.' },
  { title: 'Tech Talk: AI in Healthcare', type: 'Tech', org: 'IEEE & SCAI', date: formatDate(4), time: '11:00 AM', loc: 'Seminar Hall 1', desc: 'Guest lecture by Dr. Kavita Rao from AIIMS Bhopal on clinical AI.' },
  { title: 'Resume & LinkedIn Workshop', type: 'Career', org: 'Career Cell', date: formatDate(4), time: '2:00 PM', loc: 'MG2-303', desc: 'Learn how to craft an ATS-proof resume and optimize your LinkedIn profile.' },
  { title: 'Dance Battle Royale', type: 'Cultural', org: 'Tarang Club', date: formatDate(5), time: '6:00 PM', loc: 'Amphitheatre', desc: 'Solo and group categories. Register via the SAC portal.' },
  { title: 'CP Contest — Div 2', type: 'Tech', org: 'Competitive Programming Club', date: formatDate(6), time: '8:00 PM', loc: 'Online (CodeChef)', desc: 'Internal ranked contest. 10 problems, 2.5 hours. Prizes and cert for top 25.' },
  { title: 'Photography Walk', type: 'Cultural', org: 'Shutterbug Club', date: formatDate(7), time: '6:00 AM', loc: 'VIT Main Gate', desc: 'Campus golden-hour photography walk with critique session at 8 AM.' },
  { title: 'Blockchain 101', type: 'Workshop', org: 'Web3 VIT', date: formatDate(8), time: '4:00 PM', loc: 'TT502', desc: 'Introduction to Ethereum, smart contracts, and DeFi concepts.' },
  { title: 'Alumni Talk: VITian to Google', type: 'Career', org: 'Alumni Relations', date: formatDate(9), time: '5:00 PM', loc: 'D-Block Auditorium', desc: 'Fireside chat with 2021 batch alumnus now at Google Zurich.' },
];

const EVENT_COLORS = {
  'Tech':     { bg: '#E0F2FE', text: '#0284C7', border: '#BAE6FD' },
  'Cultural': { bg: '#DCFCE7', text: '#16A34A', border: '#BBF7D0' },
  'Workshop': { bg: '#F3E8FF', text: '#9333EA', border: '#E9D5FF' },
  'Biz':      { bg: '#FFEDD5', text: '#EA580C', border: '#FED7AA' },
  'Sports':   { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' },
  'Career':   { bg: '#FCE7F3', text: '#BE185D', border: '#FBCFE8' },
  'Default':  { bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' },
};

// Dark versions for dark themes
const EVENT_COLORS_DARK = {
  'Tech':     { bg: '#0c2d48', text: '#60c5fb', border: '#0f4c81' },
  'Cultural': { bg: '#052e16', text: '#4ade80', border: '#14532d' },
  'Workshop': { bg: '#2e1065', text: '#c084fc', border: '#4c1d95' },
  'Biz':      { bg: '#431407', text: '#fb923c', border: '#7c2d12' },
  'Sports':   { bg: '#451a03', text: '#fbbf24', border: '#78350f' },
  'Career':   { bg: '#4a044e', text: '#f472b6', border: '#701a75' },
  'Default':  { bg: '#1f2937', text: '#9ca3af', border: '#374151' },
};

export default function EventsScreen() {
  const { theme, themeMode } = useContext(AppContext);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDateLabel, setSelectedDateLabel] = useState(formatDate(0));

  const isDark = themeMode !== 'light';
  const colorMap = isDark ? EVENT_COLORS_DARK : EVENT_COLORS;

  const filteredEvents = EVENTS.filter(e => e.date === selectedDateLabel);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.surface }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <Animated.View entering={FadeInDown.duration(600)} className="mb-5 mt-2 px-6">
          <Text className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: theme.textLight }}>Campus Life</Text>
          <Text className="text-4xl font-bold tracking-tight" style={{ color: theme.text }}>Events</Text>
        </Animated.View>

        {/* CALENDAR STRIP */}
        <ScrollView horizontal className="mb-6 pl-6" showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 24 }}>
          {CALENDAR_DAYS.map((day, i) => {
            const isSelected = selectedDateLabel === day.label;
            const hasEvents = EVENTS.some(e => e.date === day.label);
            return (
              <TouchableOpacity key={day.label} onPress={() => setSelectedDateLabel(day.label)} className="mr-3">
                <Animated.View
                  entering={FadeInDown.delay(i * 40)}
                  className="w-16 h-[90px] rounded-2xl items-center justify-center border"
                  style={{
                    backgroundColor: isSelected ? theme.primary : theme.bg,
                    borderColor: isSelected ? theme.primary : theme.border,
                    shadowColor: isSelected ? theme.primary : 'transparent',
                    shadowOpacity: isSelected ? 0.4 : 0,
                    shadowRadius: 8,
                    elevation: isSelected ? 8 : 0,
                  }}
                >
                  <Text className="font-bold text-[10px]" style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : theme.textLight }}>{day.day}</Text>
                  <Text className="text-2xl font-bold" style={{ color: isSelected ? 'white' : theme.text }}>{day.date}</Text>
                  <Text className="font-bold text-[10px]" style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : theme.textLight }}>{day.monthStr}</Text>
                  {hasEvents && (
                    <View className="h-1.5 w-1.5 rounded-full mt-1" style={{ backgroundColor: isSelected ? 'white' : theme.primary }} />
                  )}
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* EVENTS LIST */}
        <View className="px-6">
          <Text className="text-lg font-bold mb-4" style={{ color: theme.text }}>
            {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} on {selectedDateLabel}
          </Text>

          {filteredEvents.length === 0 ? (
            <View className="py-12 items-center justify-center rounded-3xl border border-dashed" style={{ borderColor: theme.border, backgroundColor: theme.bg }}>
              <Calendar size={40} color={theme.textLight} />
              <Text className="text-lg font-medium mt-4" style={{ color: theme.textLight }}>No events scheduled</Text>
              <Text className="text-sm mt-1 text-center px-6" style={{ color: theme.textLight }}>Check adjacent days — something is always happening on campus!</Text>
            </View>
          ) : (
            filteredEvents.map((event, i) => {
              const colors = colorMap[event.type] || colorMap.Default;
              return (
                <TouchableOpacity key={i} onPress={() => setSelectedEvent(event)} activeOpacity={0.88}>
                  <Animated.View
                    entering={FadeInDown.delay(i * 80)}
                    className="p-5 rounded-3xl border mb-4"
                    style={{
                      backgroundColor: theme.surface, borderColor: theme.border,
                      shadowColor: theme.primary, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
                    }}
                  >
                    <View className="flex-row justify-between items-start mb-3">
                      <View className="px-3 py-1 rounded-full border" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                        <Text className="font-bold text-[10px] uppercase tracking-wider" style={{ color: colors.text }}>{event.type}</Text>
                      </View>
                      <Text className="font-bold text-sm" style={{ color: theme.primary }}>{event.time}</Text>
                    </View>
                    <Text className="text-xl font-bold mb-2 leading-tight" style={{ color: theme.text }}>{event.title}</Text>
                    <Text className="text-sm mb-3 leading-5" style={{ color: theme.textLight }} numberOfLines={2}>{event.desc}</Text>
                    <View className="flex-row items-center">
                      <MapPin size={13} color={theme.textLight} />
                      <Text className="text-xs ml-1 font-medium" style={{ color: theme.textLight }}>{event.loc}</Text>
                    </View>
                  </Animated.View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* EVENT DETAIL MODAL */}
      <Modal visible={!!selectedEvent} transparent animationType="slide" onRequestClose={() => setSelectedEvent(null)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <View className="rounded-t-[36px] p-8 shadow-2xl" style={{ backgroundColor: theme.surface, minHeight: '55%' }}>
            {selectedEvent && (() => {
              const colors = colorMap[selectedEvent.type] || colorMap.Default;
              return (
                <>
                  <View className="flex-row justify-between items-center mb-5">
                    <View className="px-3 py-1 rounded-full border" style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                      <Text className="font-bold text-xs uppercase tracking-wider" style={{ color: colors.text }}>{selectedEvent.type}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedEvent(null)} className="p-2 rounded-full" style={{ backgroundColor: theme.bg }}>
                      <X size={22} color={theme.icon} />
                    </TouchableOpacity>
                  </View>

                  <Text className="font-bold uppercase text-xs mb-2" style={{ color: theme.primary }}>{selectedEvent.org}</Text>
                  <Text className="text-2xl font-bold mb-3 leading-tight" style={{ color: theme.text }}>{selectedEvent.title}</Text>
                  <Text className="text-base mb-6 leading-6" style={{ color: theme.textLight }}>{selectedEvent.desc}</Text>

                  <View className="p-5 rounded-2xl border mb-6" style={{ backgroundColor: theme.bg, borderColor: theme.border }}>
                    <View className="flex-row items-center mb-3">
                      <Clock size={18} color={theme.textLight} />
                      <Text className="ml-3 font-semibold" style={{ color: theme.text }}>{selectedEvent.date} at {selectedEvent.time}</Text>
                    </View>
                    <View className="flex-row items-center">
                      <MapPin size={18} color={theme.textLight} />
                      <Text className="ml-3 font-semibold" style={{ color: theme.text }}>{selectedEvent.loc}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    className="h-14 rounded-2xl items-center justify-center flex-row"
                    style={{ backgroundColor: theme.primary }}
                    activeOpacity={0.85}
                  >
                    <Zap size={18} color="white" />
                    <Text className="text-white font-bold text-lg ml-2">RSVP / Remind Me</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}