import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Modal, Alert, Image, StyleSheet
} from 'react-native';
import { AppContext } from '../context/AppContext';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import {
  Send, Sparkles, Plus, X, MessageCircle, Link2, Globe, Paperclip,
  FileText, ImageIcon, Trophy, Users, UserCheck, ChevronRight
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/* ── Full Image Preview Modal Component ── */
function FullImageModal({ visible, imageUri, onClose, theme }) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity style={{ position: 'absolute', top: 50, right: 30, zIndex: 10, width: 44, height: 44, 
          borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }} 
          onPress={onClose}>
          <X color="white" size={24} />
        </TouchableOpacity>
        <Image 
          source={{ uri: imageUri }} 
          style={{ width: '100%', height: '80%', resizeMode: 'contain' }} 
        />
        <View style={{ position: 'absolute', bottom: 50 }}>
          <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>Image Preview</Text>
        </View>
      </View>
    </Modal>
  );
}

/* ── helpers ─────────────────────────────────────────────────────────────── */
const QUICK = [
  "What is my attendance in each subject?",
  "Which subject am I at risk of failing?",
  "Create a study plan for my free slots today",
  "Help me improve my lowest grade",
];

const rankMedal = (r) => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `#${r}`;

/* ── Main Component ──────────────────────────────────────────────────────── */
export default function BuddyScreen() {
  const { theme, API_URL, authToken, currentUser } = useContext(AppContext);
  const [tab, setTab] = useState('coco');

  const tabs = [
    { key: 'coco', label: 'Coco AI', Icon: Sparkles },
    { key: 'connect', label: 'Connect', Icon: Link2 },
    { key: 'community', label: 'Community', Icon: Globe },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Tab Bar */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
        backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        {tabs.map(({ key, label, Icon }) => {
          const active = tab === key;
          return (
            <TouchableOpacity key={key} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTab(key); }}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                paddingVertical: 10, marginHorizontal: 4, borderRadius: 16,
                backgroundColor: active ? `${theme.primary}18` : 'transparent' }}>
              <Icon size={15} color={active ? theme.primary : theme.textLight} />
              <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: '800', letterSpacing: 0.5,
                color: active ? theme.primary : theme.textLight }}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === 'coco' && <CocoTab theme={theme} API_URL={API_URL} authToken={authToken} currentUser={currentUser} />}
      {tab === 'connect' && <ConnectTab theme={theme} API_URL={API_URL} authToken={authToken} currentUser={currentUser} />}
      {tab === 'community' && <CommunityTab theme={theme} API_URL={API_URL} authToken={authToken} currentUser={currentUser} />}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COCO AI TAB
═══════════════════════════════════════════════════════════════════════════ */
function CocoTab({ theme, API_URL, authToken, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setInput('');
    setLoading(true);
    const userMsg = { id: `u${Date.now()}`, role: 'user', text: q, ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(p => [...p, userMsg]);
    try {
      const res = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ message: q, history: messages.map(m => ({ role: m.role, content: m.text })) }),
      });
      const data = await res.json();
      setMessages(p => [...p, {
        id: `a${Date.now()}`, role: 'assistant',
        text: res.ok ? data.reply : `Error: ${data.detail || 'Unknown'}`,
        ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch (e) {
      setMessages(p => [...p, { id: `e${Date.now()}`, role: 'assistant', text: '❌ Cannot reach server. Is backend running?', ts: '' }]);
    }
    setLoading(false);
  };

  useEffect(() => { setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100); }, [messages.length]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 8 }}>
        {messages.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 24 }}>
            <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: `${theme.primary}15`,
              alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Sparkles size={44} color={theme.primary} />
            </View>
            <Text style={{ fontSize: 28, fontWeight: '900', color: theme.text, marginBottom: 8 }}>Hey, I'm Coco!</Text>
            <Text style={{ fontSize: 14, color: theme.textLight, textAlign: 'center', lineHeight: 22, marginBottom: 28, paddingHorizontal: 16 }}>
              I know your attendance, grades & schedule. Ask me anything!
            </Text>
            {QUICK.map((p, i) => (
              <TouchableOpacity key={i} onPress={() => send(p)}
                style={{ width: '100%', padding: 16, borderRadius: 18, borderWidth: 1,
                  borderColor: theme.border, backgroundColor: theme.surface, marginBottom: 10 }}>
                <Text style={{ fontWeight: '700', color: theme.text, fontSize: 14 }}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {messages.map((m) => (
          <View key={m.id} style={{ marginBottom: 16, alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%',
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {m.role === 'assistant' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: `${theme.primary}20`,
                  alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
                  <Sparkles size={10} color={theme.primary} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '800', color: theme.primary }}>Coco</Text>
              </View>
            )}
            <View style={{ padding: 14, borderRadius: 20,
              borderTopRightRadius: m.role === 'user' ? 4 : 20,
              borderTopLeftRadius: m.role === 'assistant' ? 4 : 20,
              backgroundColor: m.role === 'user' ? theme.primary : theme.surface,
              borderWidth: m.role === 'assistant' ? 1 : 0,
              borderColor: theme.border }}>
              <Text style={{ fontSize: 15, lineHeight: 22, fontWeight: '500',
                color: m.role === 'user' ? 'white' : theme.text }}>{m.text}</Text>
            </View>
            <Text style={{ fontSize: 10, color: theme.textLight, marginTop: 4,
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start' }}>{m.ts}</Text>
          </View>
        ))}

        {loading && (
          <View style={{ alignSelf: 'flex-start', padding: 16, borderRadius: 20, borderTopLeftRadius: 4,
            backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, flexDirection: 'row', alignItems: 'center' }}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={{ marginLeft: 10, color: theme.textLight, fontWeight: '600' }}>Coco is thinking...</Text>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 28,
        backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.border }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 24,
          borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bg, paddingHorizontal: 16, height: 52 }}>
          <TextInput value={input} onChangeText={setInput} placeholder="Ask Coco..." placeholderTextColor={theme.textLight}
            style={{ flex: 1, fontSize: 15, color: theme.text }} onSubmitEditing={() => send()} returnKeyType="send" />
        </View>
        <TouchableOpacity onPress={() => send()} disabled={!input.trim() || loading}
          style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: (!input.trim() || loading) ? `${theme.primary}50` : theme.primary,
            alignItems: 'center', justifyContent: 'center', marginLeft: 10 }}>
          <Send color="white" size={20} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONNECT TAB
═══════════════════════════════════════════════════════════════════════════ */
function ConnectTab({ theme, API_URL, authToken, currentUser }) {
  const [suggestions, setSuggestions] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sentIds, setSentIds] = useState(new Set());

  const fetch_ = async () => {
    try {
      const [s, p] = await Promise.all([
        fetch(`${API_URL}/communities/connections/suggested`, { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch(`${API_URL}/connections/pending`, { headers: { Authorization: `Bearer ${authToken}` } }),
      ]);
      if (s.ok) setSuggestions(await s.json());
      if (p.ok) setPending(await p.json());
    } catch (e) { console.log(e); }
    setLoading(false);
  };

  useEffect(() => { fetch_(); }, []);

  const sendInvite = async (reg, goals) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await fetch(`${API_URL}/connections/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ receiver_id: reg, shared_goals: goals }),
      });
      if (res.ok) { 
        setSentIds(prev => new Set(prev).add(reg));
        fetch_(); 
      }
    } catch (e) { console.log(e); }
  };

  const doAction = async (id, action) => {
    try {
      const res = await fetch(`${API_URL}/connections/${id}/${action}`, { method: 'POST', headers: { Authorization: `Bearer ${authToken}` } });
      if (res.ok) fetch_();
    } catch (e) { console.log(e); }
  };

  if (loading) return <ActivityIndicator color={theme.primary} size="large" style={{ marginTop: 80 }} />;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
      {/* Pending Invites */}
      {pending.length > 0 && (
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 11, fontWeight: '900', color: theme.primary, textTransform: 'uppercase',
            letterSpacing: 1.5, marginBottom: 14 }}>📬 Inbox — {pending.length} Invite{pending.length > 1 ? 's' : ''}</Text>
          {pending.map((p, i) => (
            <Animated.View key={p.id} entering={FadeInDown.delay(i * 80)}
              style={{ padding: 20, borderRadius: 24, borderWidth: 1, borderColor: theme.border,
                backgroundColor: theme.surface, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: `${theme.primary}20`,
                  alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: theme.primary }}>{p.requester_name?.[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: theme.text }}>{p.requester_name}</Text>
                  <Text style={{ fontSize: 12, color: theme.textLight, marginTop: 2 }}>{p.requester_branch}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={() => doAction(p.id, 'accept')}
                  style={{ flex: 1, height: 46, borderRadius: 16, backgroundColor: theme.primary,
                    alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: 'white', fontWeight: '800' }}>Accept ✓</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => doAction(p.id, 'reject')}
                  style={{ flex: 1, height: 46, borderRadius: 16, borderWidth: 1,
                    borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontWeight: '700', color: theme.textLight }}>Decline</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          ))}
        </View>
      )}

      {/* Suggested Buddies */}
      <Text style={{ fontSize: 11, fontWeight: '900', color: theme.textLight, textTransform: 'uppercase',
        letterSpacing: 1.5, marginBottom: 14 }}>✨ Suggested Study Buddies</Text>
      {suggestions.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 40, borderRadius: 24, borderWidth: 1,
          borderStyle: 'dashed', borderColor: theme.border }}>
          <Text style={{ fontSize: 36, marginBottom: 12 }}>🤝</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.textLight, textAlign: 'center', paddingHorizontal: 24 }}>
            Add some goals first! We'll match you with students who have the same goals.
          </Text>
        </View>
      ) : suggestions.map((u, i) => {
        const alreadySent = sentIds.has(u.registration_number);
        return (
          <Animated.View key={u.registration_number} entering={FadeInDown.delay(i * 80)}
            style={{ padding: 20, borderRadius: 24, borderWidth: 1, borderColor: theme.border,
              backgroundColor: theme.surface, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#FEF3C7',
                alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Text style={{ fontSize: 24, fontWeight: '900', color: '#D97706' }}>{u.name?.[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: theme.text }}>{u.name}</Text>
                <Text style={{ fontSize: 12, color: theme.textLight }}>{u.branch}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {u.shared_keywords.slice(0, 3).map((kw, ki) => (
                    <View key={ki} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12,
                      backgroundColor: `${theme.primary}15` }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: theme.primary }}>🎯 {kw}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={() => !alreadySent && sendInvite(u.registration_number, u.shared_keywords)} disabled={alreadySent}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                height: 46, borderRadius: 16, borderWidth: 1.5, borderColor: alreadySent ? theme.textLight : theme.primary,
                backgroundColor: alreadySent ? `${theme.textLight}10` : `${theme.primary}10` }}>
              {alreadySent ? <UserCheck size={16} color={theme.textLight} /> : <Link2 size={16} color={theme.primary} />}
              <Text style={{ marginLeft: 8, fontWeight: '900', color: alreadySent ? theme.textLight : theme.primary, fontSize: 14 }}>
                {alreadySent ? 'Invitation Sent ✓' : 'Send Invitation'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   COMMUNITY TAB
═══════════════════════════════════════════════════════════════════════════ */
function CommunityTab({ theme, API_URL, authToken, currentUser }) {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [chatCommunity, setChatCommunity] = useState(null);
  const [leaderboardCommunity, setLeaderboardCommunity] = useState(null);

  const fetchAll = async () => {
    try {
      const res = await fetch(`${API_URL}/communities/`, { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.ok) setCommunities(await res.json());
    } catch (e) { console.log(e); }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const joinLeave = async (id, isMember) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await fetch(`${API_URL}/communities/${id}/${isMember ? 'leave' : 'join'}`, {
        method: 'POST', headers: { Authorization: `Bearer ${authToken}` }
      });
      fetchAll();
    } catch (e) { console.log(e); }
  };

  const mine = communities.filter(c => c.is_member);
  const invited = communities.filter(c => c.is_invited && !c.is_member);
  const explore = communities.filter(c => !c.is_member && !c.is_invited);

  if (loading) return <ActivityIndicator color={theme.primary} size="large" style={{ marginTop: 80 }} />;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {/* Create CTA */}
        <TouchableOpacity onPress={() => setCreateModal(true)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            padding: 18, borderRadius: 22, borderWidth: 2, borderStyle: 'dashed',
            borderColor: theme.primary, backgroundColor: `${theme.primary}08`, marginBottom: 24 }}>
          <Plus size={20} color={theme.primary} />
          <Text style={{ marginLeft: 10, fontWeight: '900', color: theme.primary, fontSize: 15 }}>
            Create a Community
          </Text>
        </TouchableOpacity>

        {/* Invitations */}
        {invited.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: theme.textLight, textTransform: 'uppercase',
              letterSpacing: 1.5, marginBottom: 12 }}>📬 Invitations</Text>
            {invited.map((c, i) => (
              <CommunityCard key={c.id} c={c} theme={theme} onJoin={() => joinLeave(c.id, false)}
                showChat={false} showLeaderboard={false} invited />
            ))}
          </View>
        )}

        {/* My communities */}
        {mine.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: theme.primary, textTransform: 'uppercase',
              letterSpacing: 1.5, marginBottom: 12 }}>✅ My Communities</Text>
            {mine.map((c, i) => (
              <CommunityCard key={c.id} c={c} theme={theme}
                onLeave={() => joinLeave(c.id, true)}
                onChat={() => setChatCommunity(c)}
                onLeaderboard={() => setLeaderboardCommunity(c)}
                isMember />
            ))}
          </View>
        )}

        {/* Explore */}
        {explore.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: theme.textLight, textTransform: 'uppercase',
              letterSpacing: 1.5, marginBottom: 12 }}>🌍 Explore Communities</Text>
            {explore.map((c, i) => (
              <CommunityCard key={c.id} c={c} theme={theme} onJoin={() => joinLeave(c.id, false)} />
            ))}
          </View>
        )}

        {communities.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🏘️</Text>
            <Text style={{ fontSize: 20, fontWeight: '900', color: theme.text }}>No communities yet</Text>
            <Text style={{ fontSize: 14, color: theme.textLight, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }}>
              Be the first! Create a community and invite classmates with matching goals.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      {createModal && (
        <CreateModal visible onClose={() => setCreateModal(false)}
          onCreated={() => { setCreateModal(false); fetchAll(); }}
          theme={theme} API_URL={API_URL} authToken={authToken} />
      )}
      {chatCommunity && (
        <CommunityChatModal community={chatCommunity} onClose={() => setChatCommunity(null)}
          theme={theme} API_URL={API_URL} authToken={authToken} currentUser={currentUser} />
      )}
      {leaderboardCommunity && (
        <LeaderboardModal community={leaderboardCommunity} onClose={() => setLeaderboardCommunity(null)}
          theme={theme} API_URL={API_URL} authToken={authToken} />
      )}
    </View>
  );
}

/* Community Card */
function CommunityCard({ c, theme, onJoin, onLeave, onChat, onLeaderboard, isMember, invited }) {
  return (
    <Animated.View entering={FadeInDown}
      style={{ padding: 20, borderRadius: 24, borderWidth: 1, borderColor: theme.border,
        backgroundColor: theme.surface, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: theme.text }}>{c.name}</Text>
          <Text style={{ fontSize: 13, color: theme.textLight, marginTop: 3 }}>{c.description}</Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textLight, marginTop: 4 }}>
            👥 {c.member_count} member{c.member_count !== 1 ? 's' : ''}
          </Text>
        </View>
        {/* Tags */}
        {c.goal_tags?.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, maxWidth: 120 }}>
            {c.goal_tags.slice(0,2).map((tag, i) => (
              <View key={i} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
                backgroundColor: `${theme.primary}15` }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: theme.primary }}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {invited && (
          <TouchableOpacity onPress={onJoin}
            style={{ flex: 1, height: 44, borderRadius: 14, backgroundColor: theme.primary,
              alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>Accept Invite</Text>
          </TouchableOpacity>
        )}
        {!isMember && !invited && (
          <TouchableOpacity onPress={onJoin}
            style={{ flex: 1, height: 44, borderRadius: 14, backgroundColor: theme.primary,
              alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>Join</Text>
          </TouchableOpacity>
        )}
        {isMember && (
          <>
            <TouchableOpacity onPress={onChat}
              style={{ flex: 1, height: 44, borderRadius: 14, backgroundColor: theme.primary,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <MessageCircle size={15} color="white" />
              <Text style={{ color: 'white', fontWeight: '800', fontSize: 13 }}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onLeaderboard}
              style={{ height: 44, width: 44, borderRadius: 14, borderWidth: 1, borderColor: theme.border,
                alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={18} color="#F59E0B" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </Animated.View>
  );
}

/* ── Create Community Modal ─────────────────────────────────────────────── */
function CreateModal({ visible, onClose, onCreated, theme, API_URL, authToken }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Community name required'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/communities/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          name: name.trim(), description: desc.trim(),
          goal_tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      if (res.ok) { setName(''); setDesc(''); setTags(''); onCreated(); }
      else Alert.alert('Error', 'Failed to create community');
    } catch (e) { Alert.alert('Error', e.message); }
    setLoading(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 28, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 24, fontWeight: '900', color: theme.text }}>New Community</Text>
              <TouchableOpacity onPress={onClose}><X color={theme.text} size={24} /></TouchableOpacity>
            </View>
            {[
              { label: 'Community Name *', val: name, set: setName, ph: 'e.g. LeetCode Grinders' },
              { label: 'Description', val: desc, set: setDesc, ph: 'What is this community about?' },
              { label: 'Goal Tags (comma-separated)', val: tags, set: setTags, ph: 'leetcode, placement, dsa' },
            ].map((f) => (
              <View key={f.label} style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: theme.textLight, marginBottom: 8,
                  textTransform: 'uppercase', letterSpacing: 1 }}>{f.label}</Text>
                <View style={{ height: 52, borderRadius: 16, borderWidth: 1, borderColor: theme.border,
                  backgroundColor: theme.bg, justifyContent: 'center', paddingHorizontal: 16 }}>
                  <TextInput value={f.val} onChangeText={f.set} placeholder={f.ph}
                    placeholderTextColor={theme.textLight} style={{ color: theme.text, fontSize: 15 }} />
                </View>
              </View>
            ))}
            <TouchableOpacity onPress={create} disabled={loading}
              style={{ height: 56, borderRadius: 20, backgroundColor: theme.primary,
                alignItems: 'center', justifyContent: 'center', marginTop: 8, opacity: loading ? 0.7 : 1 }}>
              {loading ? <ActivityIndicator color="white" /> :
                <Text style={{ color: 'white', fontWeight: '900', fontSize: 16 }}>Create & Auto-Invite Matches</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/* ── Community Chat Modal ────────────────────────────────────────────────── */
function CommunityChatModal({ community, onClose, theme, API_URL, authToken, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const scrollRef = useRef();

  const fetchMsgs = async () => {
    try {
      const res = await fetch(`${API_URL}/communities/${community.id}/messages`, { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.ok) setMessages(await res.json());
    } catch (e) { console.log(e); }
  };

  useEffect(() => { fetchMsgs(); const t = setInterval(fetchMsgs, 4000); return () => clearInterval(t); }, []);
  useEffect(() => { setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100); }, [messages.length]);

  const sendText = async () => {
    const txt = input.trim();
    if (!txt) return;
    setInput('');
    try {
      await fetch(`${API_URL}/communities/${community.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ content: txt }),
      });
      fetchMsgs();
    } catch (e) { console.log(e); }
  };

  const sendImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo access to send images'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.6 });
      if (!result.canceled && result.assets[0].base64) {
        await fetch(`${API_URL}/communities/${community.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ content: '', attachment_name: 'image.jpg', attachment_type: 'image', attachment_data: result.assets[0].base64 }),
        });
        fetchMsgs();
      }
    } catch (e) { console.log(e); }
  };

  const sendDoc = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      if (!result.canceled) {
        // Since we need base64 for current simple transport, we read the file
        const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.Base64 });
        await fetch(`${API_URL}/communities/${community.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ 
            content: '', attachment_name: result.assets[0].name, 
            attachment_type: 'document', attachment_data: base64 
          }),
        });
        fetchMsgs();
      }
    } catch (e) { console.log(e); }
  };

  const openDoc = async (m) => {
    try {
      const fileUri = `${FileSystem.cacheDirectory}${m.attachment_name}`;
      await FileSystem.writeAsStringAsync(fileUri, m.attachment_data, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Error', 'Sharing not available on this device');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open file');
      console.log(e);
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52,
          paddingBottom: 16, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border }}>
          <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20,
            backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <X color={theme.text} size={20} />
          </TouchableOpacity>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: `${theme.primary}20`,
            alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
            <Globe size={18} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '900', color: theme.text }}>{community.name}</Text>
            <Text style={{ fontSize: 12, color: theme.textLight }}>{community.member_count} members</Text>
          </View>
        </View>

        {/* Messages */}
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 8 }}>
          {messages.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <MessageCircle size={48} color={theme.textLight} />
              <Text style={{ marginTop: 12, fontSize: 16, fontWeight: '700', color: theme.textLight }}>
                Start the conversation!
              </Text>
            </View>
          )}
          {messages.map((m, i) => {
            const isMe = m.sender_id === currentUser?.registration_number;
            const ts = (() => { try { return new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } })();
            return (
              <View key={m.id || i} style={{ marginBottom: 16, alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
                {!isMe && <Text style={{ fontSize: 11, fontWeight: '800', color: theme.primary, marginBottom: 4 }}>{m.sender_name}</Text>}
                <TouchableOpacity activeOpacity={0.9} 
                  onPress={() => {
                    if (m.attachment_type === 'image') setPreviewImage(`data:image/jpeg;base64,${m.attachment_data}`);
                    else if (m.attachment_type === 'document') openDoc(m);
                  }}
                  style={{ borderRadius: 20, borderTopRightRadius: isMe ? 4 : 20, borderTopLeftRadius: isMe ? 20 : 4,
                  backgroundColor: isMe ? theme.primary : theme.surface,
                  borderWidth: isMe ? 0 : 1, borderColor: theme.border, overflow: 'hidden' }}>
                  {/* Image attachment */}
                  {m.attachment_type === 'image' && m.attachment_data ? (
                    <Image source={{ uri: `data:image/jpeg;base64,${m.attachment_data}` }}
                      style={{ width: 220, height: 165 }} resizeMode="cover" />
                  ) : m.attachment_name ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
                      <FileText size={24} color={isMe ? 'white' : theme.primary} />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isMe ? 'white' : theme.text }} numberOfLines={1}>
                          {m.attachment_name}
                        </Text>
                        <Text style={{ fontSize: 10, color: isMe ? 'rgba(255,255,255,0.7)' : theme.textLight }}>
                          Tap to open
                        </Text>
                      </View>
                    </View>
                  ) : null}
                  {m.content ? (
                    <Text style={{ fontSize: 15, fontWeight: '500', padding: 14,
                      paddingTop: (m.attachment_type || m.attachment_name) ? 4 : 14,
                      color: isMe ? 'white' : theme.text }}>{m.content}</Text>
                  ) : null}
                </TouchableOpacity>
                <Text style={{ fontSize: 10, color: theme.textLight, marginTop: 3,
                  alignSelf: isMe ? 'flex-end' : 'flex-start' }}>{ts}</Text>
              </View>
            );
          })}
        </ScrollView>

        <FullImageModal visible={!!previewImage} imageUri={previewImage} onClose={() => setPreviewImage(null)} theme={theme} />

        {/* Input */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, paddingBottom: 28,
            backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.border, gap: 8 }}>
            <TouchableOpacity onPress={sendImage}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.bg, borderWidth: 1,
                borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }}>
              <ImageIcon size={20} color={theme.textLight} />
            </TouchableOpacity>
            <TouchableOpacity onPress={sendDoc}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.bg, borderWidth: 1,
                borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} color={theme.textLight} />
            </TouchableOpacity>
            <View style={{ flex: 1, height: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.border,
              backgroundColor: theme.bg, paddingHorizontal: 14, justifyContent: 'center' }}>
              <TextInput value={input} onChangeText={setInput} placeholder="Message..." placeholderTextColor={theme.textLight}
                style={{ color: theme.text, fontSize: 15 }} onSubmitEditing={sendText} />
            </View>
            <TouchableOpacity onPress={sendText}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.primary,
                alignItems: 'center', justifyContent: 'center' }}>
              <Send color="white" size={18} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/* ── Leaderboard Modal ──────────────────────────────────────────────────── */
function LeaderboardModal({ community, onClose, theme, API_URL, authToken }) {
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/communities/${community.id}/leaderboard`, { headers: { Authorization: `Bearer ${authToken}` } });
        if (res.ok) setBoard(await res.json());
      } catch (e) { console.log(e); }
      setLoading(false);
    })();
  }, []);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <View style={{ backgroundColor: theme.surface, borderTopLeftRadius: 36, borderTopRightRadius: 36,
          padding: 28, maxHeight: '70%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Trophy size={22} color="#F59E0B" style={{ marginRight: 10 }} />
              <Text style={{ fontSize: 22, fontWeight: '900', color: theme.text }}>Leaderboard</Text>
            </View>
            <TouchableOpacity onPress={onClose}><X color={theme.text} size={22} /></TouchableOpacity>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textLight, marginBottom: 20 }}>
            {community.name} · Live Rankings
          </Text>

          {loading ? <ActivityIndicator color={theme.primary} /> : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {board.map((p, i) => (
                <Animated.View key={p.registration_number} entering={FadeInDown.delay(i * 60)}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
                    borderBottomWidth: 1, borderBottomColor: `${theme.border}60` }}>
                  <Text style={{ fontSize: 22, width: 44, textAlign: 'center' }}>{rankMedal(p.rank)}</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: theme.text }}>{p.name}</Text>
                    <Text style={{ fontSize: 12, color: theme.textLight }}>{p.branch}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: theme.primary }}>{p.avg_progress.toFixed(0)}%</Text>
                    <Text style={{ fontSize: 11, color: theme.textLight }}>🔥 {p.total_streak}d streak</Text>
                  </View>
                </Animated.View>
              ))}
              {board.length === 0 && (
                <Text style={{ textAlign: 'center', color: theme.textLight, padding: 24 }}>
                  No data yet. Add goals and track progress!
                </Text>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}