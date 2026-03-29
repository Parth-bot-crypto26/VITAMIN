import React, { useContext, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal, Alert, Linking, StyleSheet } from 'react-native';
import { AppContext } from '../context/AppContext';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowUpRight, RefreshCw, X, Clock, Calendar, Coffee, Sparkles, BookOpen, MapPin, ChevronRight, User } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

/* ── helpers ──────────────────────────────────────────────────────────────── */
const safeStr = (v) => (v != null ? String(v) : '');

const SLOT_MAP = {
  'A11':[510,600],'D11':[510,600],'A12':[510,600],'D12':[510,600],'A13':[510,600],'D13':[510,600],
  'B11':[605,695],'E11':[605,695],'B12':[605,695],'E12':[605,695],'B13':[605,695],'E13':[605,695],
  'C11':[700,790],'F11':[700,790],'C12':[700,790],'F12':[700,790],'C13':[700,790],'F13':[700,790],
  'A21':[795,885],'D21':[795,885],'A22':[795,885],'D22':[795,885],'A23':[795,885],'D23':[795,885],
  'A14':[890,980],'E14':[890,980],'B14':[890,980],'F14':[890,980],'C14':[890,980],'D14':[890,980],
  'B21':[985,1075],'E21':[985,1075],'B22':[985,1075],'E22':[985,1075],'B23':[985,1075],'D24':[985,1075],
  'C21':[1080,1170],'F21':[1080,1170],'A24':[1080,1170],'F22':[1080,1170],'B24':[1080,1170],'E23':[1080,1170],
};
const SLOT_DAYS = {
  MON:['A11','B11','C11','A21','A14','B21','C21'],
  TUE:['D11','E11','F11','D21','E14','E21','F21'],
  WED:['A12','B12','C12','A22','B14','B22','A24'],
  THU:['D12','E12','F12','D22','F14','E22','F22'],
  FRI:['A13','B13','C13','A23','C14','B23','B24'],
  SAT:['D13','E13','F13','D23','D14','D24','E23'],
  SUN:[],
};
const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

const fmt = (m) => {
  const h = Math.floor(m / 60), min = m % 60, ap = h >= 12 ? 'PM' : 'AM';
  return `${String(h % 12 || 12).padStart(2,'0')}:${String(min).padStart(2,'0')} ${ap}`;
};

const gradeColor = (g) => {
  if (['S','O'].includes(g)) return '#10B981';
  if (['A','A+'].includes(g)) return '#3B82F6';
  if (['B'].includes(g)) return '#F59E0B';
  return '#EF4444';
};

/* ── Component ────────────────────────────────────────────────────────────── */
export default function HomeScreen() {
  const { currentUser, fetchUserProfile, authToken, theme, API_URL, academicCalendar } = useContext(AppContext);
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [gradeModal, setGradeModal] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await fetchUserProfile?.(authToken); } catch (_) {}
    setRefreshing(false);
  }, [authToken, fetchUserProfile]);

  if (!currentUser) return null;

  /* Date / time */
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const todayDateStr = now.toISOString().split('T')[0];
  const todayStr = DAYS[now.getDay()];
  const tomorrowStr = DAYS[(now.getDay() + 1) % 7];
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  /* Calendar */
  const todayCalEvent = academicCalendar?.[todayDateStr];
  const isHoliday = todayCalEvent?.event_type === 'holiday';
  const isExamDay = todayCalEvent?.event_type === 'exam';
  const calColor = isHoliday ? '#10B981' : isExamDay ? '#EF4444' : '#F59E0B';

  /* Schedule Logic */
  const currentSem = safeStr(currentUser.current_semester);
  const allSchedule = Array.isArray(currentUser.schedule) ? currentUser.schedule : [];
  
  const getDailyClasses = (dayKey) => {
    return allSchedule
      .filter(s => {
        if (currentSem && safeStr(s?.semester) !== currentSem) return false;
        const m = safeStr(s?.time).match(/\b([A-G][1-2][1-4])\b/);
        return m && (SLOT_DAYS[dayKey] || []).includes(m[1]);
      })
      .map(s => {
        const m = safeStr(s?.time).match(/\b([A-G][1-2][1-4])\b/);
        const [st, en] = SLOT_MAP[m[1]];
        const status = dayKey !== todayStr ? 'upcoming' : (currentMins >= st && currentMins <= en ? 'live' : currentMins > en ? 'done' : 'upcoming');
        return { ...s, startMin: st, endMin: en, status, timeStr: `${fmt(st)} – ${fmt(en)}` };
      })
      .sort((a, b) => a.startMin - b.startMin);
  };

  const classesToday = isHoliday ? [] : getDailyClasses(todayStr);
  const classesTomorrow = getDailyClasses(tomorrowStr);
  const isShowTomorrow = classesToday.length === 0;
  const todayClasses = isShowTomorrow ? classesTomorrow : classesToday;

  /* Tasks today */
  const todayTasks = (Array.isArray(currentUser.tasks) ? currentUser.tasks : [])
    .filter(t => t.date === todayDateStr && !t.done);

  /* Active / next class */
  const liveClass = classesToday.find(c => c.status === 'live');
  const nextClass = classesToday.find(c => c.status === 'upcoming');
  const heroClass = liveClass || nextClass || (isShowTomorrow ? classesTomorrow[0] : null);

  /* Free slots */
  const freeSlots = useMemo(() => {
    if (isHoliday) return [{ st: 510, en: 1170, label: 'Full Day Free 🎉' }];
    const busy = [...classesToday].sort((a,b) => a.startMin - b.startMin);
    const slots = [];
    let cursor = 510;
    busy.forEach(b => {
      if (b.startMin - cursor >= 45) slots.push({ st: cursor, en: b.startMin });
      cursor = Math.max(cursor, b.endMin);
    });
    if (1170 - cursor >= 45) slots.push({ st: cursor, en: 1170 });
    return slots;
  }, [classesToday, isHoliday]);

  /* Grades by semester */
  const gradeGroups = useMemo(() => {
    const g = {};
    (currentUser.grades || []).forEach(gr => {
      const k = gr.semester_name || gr.exam_month || 'Other';
      if (!g[k]) g[k] = [];
      g[k].push(gr);
    });
    return Object.entries(g).sort(([a],[b]) => b.localeCompare(a));
  }, [currentUser.grades]);

  /* Attendance color */
  const attPct = currentUser.attendance || 0;
  const attColor = attPct >= 85 ? '#10B981' : attPct >= 75 ? '#F59E0B' : '#EF4444';

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      >
        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown} style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textLight, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
              {greeting} 👋
            </Text>
            <Text style={{ fontSize: 36, fontWeight: '900', color: theme.text, letterSpacing: -1, lineHeight: 42 }}>
              {currentUser.name?.split(' ')[0] || 'Student'}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.primary, marginTop: 4 }}>
              {currentSem || 'Sync VTOP to begin'}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => navigation.navigate('VTOPSync')}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${theme.primary}15`, alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={20} color={theme.primary} />
          </TouchableOpacity>
        </Animated.View>

        {/* ── HOLIDAY BANNER ─────────────────────────────────────────────── */}
        {todayCalEvent && (
          <Animated.View entering={FadeInDown.delay(100)}
            style={{ marginHorizontal: 24, marginTop: 16, borderRadius: 20, padding: 16,
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: `${calColor}15`, borderWidth: 1, borderColor: `${calColor}40` }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: calColor,
              alignItems: 'center', justifyContent: 'center' }}>
              <Calendar color="white" size={22} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ fontWeight: '900', fontSize: 16, color: calColor }}>
                {isHoliday ? '🎉 Holiday Today' : isExamDay ? '📝 Exam Day' : '📅 Event'}
              </Text>
              <Text style={{ fontSize: 13, color: theme.textLight, marginTop: 2 }}>
                {todayCalEvent.description}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* ── STATS ROW ──────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(150)} style={{ flexDirection: 'row', paddingHorizontal: 24, marginTop: 20, gap: 12 }}>
          {/* Attendance */}
          <View style={{ flex: 1, borderRadius: 24, padding: 20,
            backgroundColor: `${attColor}12`, borderWidth: 1, borderColor: `${attColor}25` }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: attColor, textTransform: 'uppercase',
              letterSpacing: 1.2, marginBottom: 8 }}>Attendance</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 40, fontWeight: '900', color: theme.text, letterSpacing: -2 }}>
                {attPct.toFixed(0)}
              </Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: theme.textLight, marginBottom: 4, marginLeft: 2 }}>%</Text>
            </View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: attColor, marginTop: 2 }}>
              {attPct >= 85 ? '✅ Safe Zone' : attPct >= 75 ? '⚠️ At Risk' : '🔴 Critical'}
            </Text>
          </View>

          {/* CGPA */}
          <TouchableOpacity onPress={() => setGradeModal(true)}
            style={{ flex: 1, borderRadius: 24, padding: 20,
              backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE' }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#6366F1', textTransform: 'uppercase',
              letterSpacing: 1.2, marginBottom: 8 }}>CGPA</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 40, fontWeight: '900', color: '#312E81', letterSpacing: -2 }}>
                {currentUser.cgpa != null ? currentUser.cgpa.toFixed(2) : '0.00'}
              </Text>
              <Sparkles size={18} color="#6366F1" style={{ marginBottom: 6, marginLeft: 6 }} />
            </View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#818CF8', marginTop: 2 }}>Tap to see grades →</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── HERO CLASS CARD ────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(200)} style={{
          marginHorizontal: 24, marginTop: 20, borderRadius: 28, padding: 24,
          backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
        }}>
          {heroClass ? (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                  backgroundColor: liveClass ? '#10B98120' : `${theme.primary}15` }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: liveClass ? '#10B981' : theme.primary,
                    textTransform: 'uppercase', letterSpacing: 1 }}>
                    {liveClass ? '🔴 LIVE NOW' : '⏰ UP NEXT'}
                  </Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textLight }}>{heroClass.timeStr}</Text>
              </View>

              <Text style={{ fontSize: 26, fontWeight: '900', color: theme.text, lineHeight: 32, marginBottom: 6 }}>
                {heroClass.course_name || heroClass.title}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '800', color: theme.primary, textTransform: 'uppercase',
                letterSpacing: 1, marginBottom: 4 }}>
                {heroClass.course_code} · {heroClass.type}
              </Text>
              {heroClass.loc ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                  <MapPin size={14} color={theme.textLight} />
                  <Text style={{ fontSize: 13, color: theme.textLight, marginLeft: 4 }}>
                    {heroClass.loc} · {heroClass.faculty_name}
                  </Text>
                </View>
              ) : <View style={{ height: 20 }} />}

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => Linking.openURL('googlechrome://classroom.google.com').catch(
                    () => Linking.openURL('https://classroom.google.com').catch(() => Alert.alert('Error','Classroom not found')))}
                  style={{ flex: 1, height: 52, borderRadius: 18, backgroundColor: theme.primary,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: 'white', fontWeight: '900', fontSize: 14, marginRight: 6 }}>Open Classroom</Text>
                  <ArrowUpRight color="white" size={18} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation.navigate('VTOPSync')}
                  style={{ width: 52, height: 52, borderRadius: 18, borderWidth: 1, borderColor: theme.border,
                    backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
                  <RefreshCw color={theme.text} size={20} />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>{isHoliday ? '🎉' : '🌙'}</Text>
              <Text style={{ fontSize: 22, fontWeight: '900', color: theme.text, textAlign: 'center' }}>
                {isHoliday ? 'Enjoy the Holiday!' : 'No More Classes Today'}
              </Text>
              <Text style={{ fontSize: 14, color: theme.textLight, marginTop: 8, textAlign: 'center' }}>
                {isHoliday ? todayCalEvent?.description : 'All done for the day 🎊'}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* ── FREE SLOTS ─────────────────────────────────────────────────── */}
        {freeSlots.length > 0 && (
          <Animated.View entering={FadeInDown.delay(250)} style={{ paddingHorizontal: 24, marginTop: 28 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: theme.text, marginBottom: 14 }}>
              Free Slots ☕
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {freeSlots.map((s, i) => (
                <View key={i} style={{
                  paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16,
                  backgroundColor: `${theme.primary}10`, borderWidth: 1, borderColor: `${theme.primary}25`,
                  borderStyle: 'dashed',
                }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: theme.primary }}>
                    {fmt(s.st)} – {fmt(s.en)}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textLight, marginTop: 2 }}>
                    {Math.round((s.en - s.st) / 60 * 10) / 10}h free
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* ── TODAY'S SCHEDULE ───────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(300)} style={{ paddingHorizontal: 24, marginTop: 28 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
            <Text style={{ fontSize: 28, fontWeight: '900', color: theme.text, letterSpacing: -0.5 }}>
              {isShowTomorrow ? "Tomorrow's Schedule" : "Target Schedule"}
            </Text>
            <Coffee size={24} color={theme.primary} />
          </View>

          {(todayClasses.length > 0 ? todayClasses : []).map((cls, i) => (
            <Animated.View key={i} entering={FadeInDown.delay(350 + i * 100)}>
              <TouchableOpacity activeOpacity={0.8} style={{
                flexDirection: 'row', marginBottom: 18,
                opacity: cls.status === 'done' ? 0.6 : 1,
              }}>
                {/* Vertical Time Strip */}
                <View style={{ width: 14, alignItems: 'center', marginRight: 16 }}>
                  <View style={{ width: 3, flex: 1, backgroundColor: theme.border, borderRadius: 1.5 }} />
                  <View style={{ 
                    width: 14, height: 14, borderRadius: 7, 
                    backgroundColor: cls.status === 'live' ? '#10B981' : (cls.status === 'done' ? theme.textLight : theme.primary),
                    borderWidth: 3, borderColor: theme.bg, marginVertical: 4
                  }} />
                  <View style={{ width: 3, flex: 1, backgroundColor: theme.border, borderRadius: 1.5 }} />
                </View>

                {/* Big Horizontal Strip */}
                <View style={{
                  flex: 1, borderRadius: 28, padding: 22, backgroundColor: theme.surface,
                  borderWidth: 1.5, borderColor: cls.status === 'live' ? '#10B981' : theme.border,
                  shadowOpacity: 0.1, elevation: 3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Clock size={12} color={theme.textLight} />
                      <Text style={{ fontSize: 13, fontWeight: '800', color: theme.textLight, marginLeft: 6 }}>{cls.timeStr}</Text>
                    </View>
                    {cls.status === 'live' && (
                      <View style={{ backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                        <Text style={{ fontSize: 10, fontWeight: '900', color: 'white' }}>LIVE NOW</Text>
                      </View>
                    )}
                  </View>

                  <Text style={{ fontSize: 20, fontWeight: '900', color: theme.text, marginBottom: 6, lineHeight: 26 }}>
                    {cls.course_name || cls.title}
                  </Text>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: `${theme.primary}15` }}>
                      <Text style={{ fontSize: 10, fontWeight: '900', color: theme.primary, textTransform: 'uppercase' }}>
                        {cls.course_code}
                      </Text>
                    </View>
                    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: `${theme.textLight}15` }}>
                      <Text style={{ fontSize: 10, fontWeight: '900', color: theme.textLight, textTransform: 'uppercase' }}>
                        {cls.type}
                      </Text>
                    </View>
                  </View>

                  <View style={{ borderTopWidth: 1, borderTopColor: `${theme.border}40`, paddingTop: 16, gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: `${theme.primary}10`, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                        <MapPin size={14} color={theme.primary} />
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>{cls.loc || 'Venue TBA'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: `${theme.primary}10`, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                        <User size={14} color={theme.primary} />
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textLight }}>{cls.faculty_name || 'Faculty TBA'}</Text>
                    </View>
                  </View>

                  {cls.attendance_percentage > 0 && (
                    <View style={{ marginTop: 18 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: theme.textLight }}>ATTENDANCE</Text>
                        <Text style={{ fontSize: 11, fontWeight: '900', color: cls.attendance_percentage >= 75 ? '#10B981' : '#EF4444' }}>
                          {cls.attendance_percentage}%
                        </Text>
                      </View>
                      <View style={{ height: 8, borderRadius: 4, backgroundColor: `${theme.border}50`, overflow: 'hidden' }}>
                        <View style={{ 
                          height: 8, width: `${Math.min(cls.attendance_percentage, 100)}%`, 
                          backgroundColor: cls.attendance_percentage >= 75 ? '#10B981' : '#EF4444' 
                        }} />
                      </View>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}

          {todayClasses.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 48, backgroundColor: `${theme.primary}05`, borderRadius: 32, borderStyle: 'dashed', borderWidth: 2, borderColor: `${theme.primary}20` }}>
              <Coffee size={48} color={theme.textLight} />
              <Text style={{ fontSize: 20, fontWeight: '900', color: theme.text, marginTop: 16 }}>No Classes Today</Text>
              <Text style={{ fontSize: 14, color: theme.textLight, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 }}>
                You're all clear! Time to focus on your personal goals and streaks.
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('VTOPSync')}
                style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, backgroundColor: theme.primary }}>
                <Text style={{ color: 'white', fontWeight: '900' }}>Check for Updates</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* ── PENDING TASKS ──────────────────────────────────────────────── */}
        {todayTasks.length > 0 && (
          <Animated.View entering={FadeInDown.delay(350)} style={{ paddingHorizontal: 24, marginTop: 24 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: theme.text, marginBottom: 14 }}>
              Tasks Due Today
            </Text>
            {todayTasks.map((t, i) => (
              <View key={i} style={{
                flexDirection: 'row', alignItems: 'center', padding: 16,
                borderRadius: 18, backgroundColor: theme.surface, borderWidth: 1,
                borderColor: theme.border, marginBottom: 10,
              }}>
                <View style={{ width: 10, height: 10, borderRadius: 5,
                  backgroundColor: theme.primary, marginRight: 14 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>{t.title}</Text>
                  {t.time_slot ? (
                    <Text style={{ fontSize: 12, color: theme.textLight, marginTop: 2 }}>⏰ {t.time_slot}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {/* ── NO DATA STATE ─────────────────────────────────────────────── */}
        {!currentUser.current_semester && (
          <Animated.View entering={FadeInDown.delay(200)}
            style={{ marginHorizontal: 24, marginTop: 20, borderRadius: 28, padding: 28,
              backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, alignItems: 'center' }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🔄</Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: theme.text, textAlign: 'center' }}>
              Sync VTOP First
            </Text>
            <Text style={{ fontSize: 14, color: theme.textLight, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
              Connect your VTOP account to see your live schedule, attendance, and grades here.
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('VTOPSync')}
              style={{ marginTop: 20, paddingHorizontal: 32, paddingVertical: 14,
                borderRadius: 20, backgroundColor: theme.primary }}>
              <Text style={{ color: 'white', fontWeight: '900', fontSize: 15 }}>Sync VTOP →</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>

      {/* ── GRADE MODAL ────────────────────────────────────────────────── */}
      <Modal visible={gradeModal} transparent animationType="slide" onRequestClose={() => setGradeModal(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 36, borderTopRightRadius: 36,
            padding: 28, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 26, fontWeight: '900', color: theme.text }}>Grade History</Text>
              <TouchableOpacity onPress={() => setGradeModal(false)}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${theme.border}80`,
                  alignItems: 'center', justifyContent: 'center' }}>
                <X color={theme.text} size={18} />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#6366F1', textTransform: 'uppercase',
              letterSpacing: 1.5, marginBottom: 20 }}>Cumulative GPA: {currentUser.cgpa?.toFixed(2) || '--'}</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {gradeGroups.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                  <Text style={{ fontSize: 36 }}>📚</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: theme.textLight, marginTop: 12 }}>
                    No grades synced yet
                  </Text>
                </View>
              ) : gradeGroups.map(([sem, grades]) => (
                <View key={sem} style={{ marginBottom: 28 }}>
                  <Text style={{ fontSize: 11, fontWeight: '900', color: theme.textLight,
                    textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>{sem}</Text>
                  {grades.map((g, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'center',
                      paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: `${theme.border}60` }}>
                      <View style={{ flex: 1, marginRight: 16 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>{g.course_title}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: theme.textLight,
                          marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {g.course_code} · {g.credits} Cr
                        </Text>
                      </View>
                      <View style={{ width: 42, height: 42, borderRadius: 21,
                        backgroundColor: `${gradeColor(g.grade)}15`, alignItems: 'center', justifyContent: 'center',
                        borderWidth: 1.5, borderColor: `${gradeColor(g.grade)}40` }}>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: gradeColor(g.grade) }}>{g.grade}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}