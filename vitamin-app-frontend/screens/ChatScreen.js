import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
  Image, Modal, Linking,
} from 'react-native';
import { AppContext } from '../context/AppContext';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Send, Search, ArrowLeft, Paperclip, FileText, Image as Img, X, Check, CheckCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/* ── Full Image Preview Modal ── */
function FullImageModal({ visible, imageUri, onClose, theme }) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity 
          style={{ position: 'absolute', top: 50, right: 30, zIndex: 10, width: 44, height: 44, 
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

const formatTs = (ts) => {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
};

const avatarColor = (name = '') => {
  const colors = ['#7C3AED','#2563EB','#059669','#D97706','#DC2626','#DB2777','#0891B2'];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return colors[sum % colors.length];
};

export default function ChatScreen() {
  const { currentUser, theme, API_URL, authToken, triggerBellAnimation } = useContext(AppContext);
  const [view, setView] = useState('list');   // 'list' | 'chat'
  const [activeBuddy, setActiveBuddy] = useState(null);

  // ── Conversations list state ──────────────────────────────────────────────
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const prevCountsRef = useRef({});

  const loadConversations = useCallback(async (silent = false) => {
    try {
      const res = await fetch(`${API_URL}/chats/conversations`, { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);

        if (silent) {
          // Bell ring for new incoming messages
          for (const conv of data) {
            if (!conv.is_mine) {
              const prev = prevCountsRef.current[conv.registration_number];
              if (prev !== undefined && conv.last_timestamp > prev) {
                triggerBellAnimation(1);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              prevCountsRef.current[conv.registration_number] = conv.last_timestamp;
            }
          }
        } else {
          // Initialize prev map
          data.forEach(c => {
            if (!c.is_mine) prevCountsRef.current[c.registration_number] = c.last_timestamp;
          });
        }
      }
    } catch (e) { console.log(e); }
    finally { setListLoading(false); }
  }, [API_URL, authToken]);

  useEffect(() => {
    loadConversations(false);
    const interval = setInterval(() => loadConversations(true), 6000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = useCallback(async (q) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const res = await fetch(`${API_URL}/chats/search?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.ok) setSearchResults(await res.json());
    } catch (e) { console.log(e); }
    finally { setIsSearching(false); }
  }, [API_URL, authToken]);

  const openChat = (buddy) => { setActiveBuddy(buddy); setView('chat'); };

  if (view === 'chat' && activeBuddy) {
    return (
      <ChatWindow
        buddy={activeBuddy}
        onBack={() => { setView('list'); setActiveBuddy(null); loadConversations(false); }}
        theme={theme}
        currentUser={currentUser}
        API_URL={API_URL}
        authToken={authToken}
      />
    );
  }

  const listToShow = searchQuery.length >= 2 ? searchResults : conversations;
  const showingSearch = searchQuery.length >= 2;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.surface }}>
      {/* HEADER */}
      <View className="px-5 pt-3 pb-3">
        <Text className="text-3xl font-black tracking-tight mb-4" style={{ color: theme.text }}>Messages</Text>
        {/* SEARCH BAR */}
        <View className="flex-row items-center rounded-2xl px-4 h-12 border" style={{ backgroundColor: theme.bg, borderColor: theme.border }}>
          <Search size={18} color={theme.textLight} />
          <TextInput
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Search by name or reg number..."
            placeholderTextColor={theme.textLight}
            style={{ flex: 1, color: theme.text, marginLeft: 10, fontSize: 14 }}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
              <X size={18} color={theme.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* LIST */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}>
        {listLoading && !showingSearch ? (
          <ActivityIndicator color={theme.primary} size="large" className="mt-10" />
        ) : isSearching ? (
          <ActivityIndicator color={theme.primary} size="small" className="mt-6" />
        ) : listToShow.length === 0 ? (
          <View className="items-center py-16">
            <Search size={48} color={theme.textLight} />
            <Text className="mt-4 font-bold text-lg" style={{ color: theme.text }}>
              {showingSearch ? 'No users found' : 'No conversations yet'}
            </Text>
            <Text className="mt-2 text-sm text-center px-8" style={{ color: theme.textLight }}>
              {showingSearch ? 'Try a different name or registration number.' : 'Search for a classmate to start chatting!'}
            </Text>
          </View>
        ) : (
          <>
            {showingSearch && (
              <Text className="text-xs font-bold uppercase tracking-widest mb-3 mt-1" style={{ color: theme.textLight }}>
                Search Results
              </Text>
            )}
            {!showingSearch && conversations.length > 0 && (
              <Text className="text-xs font-bold uppercase tracking-widest mb-3 mt-1" style={{ color: theme.textLight }}>
                Recent Chats
              </Text>
            )}
            {listToShow.map((buddy, i) => (
              <Animated.View key={buddy.registration_number} entering={FadeInDown.delay(i * 50)}>
                <TouchableOpacity onPress={() => openChat(buddy)} activeOpacity={0.85}
                  className="flex-row items-center p-4 rounded-2xl mb-2"
                  style={{ backgroundColor: theme.bg, borderColor: theme.border }}>
                  {/* Avatar */}
                  <View className="h-14 w-14 rounded-full items-center justify-center mr-3 flex-shrink-0"
                    style={{ backgroundColor: avatarColor(buddy.name) }}>
                    <Text className="text-2xl font-black text-white">{(buddy.name || '?').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row justify-between items-center">
                      <Text className="font-bold text-base" style={{ color: theme.text }}>{buddy.name}</Text>
                      {buddy.last_timestamp && (
                        <Text className="text-[11px]" style={{ color: theme.textLight }}>{formatTs(buddy.last_timestamp)}</Text>
                      )}
                    </View>
                    <Text className="text-sm mt-0.5" style={{ color: theme.textLight }} numberOfLines={1}>
                      {buddy.last_message
                        ? (buddy.is_mine ? `You: ${buddy.last_message}` : buddy.last_message)
                        : buddy.branch}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── CHAT WINDOW ────────────────────────────────────────────────────────────────
function ChatWindow({ buddy, onBack, theme, currentUser, API_URL, authToken }) {
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [attachModal, setAttachModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const scrollRef = useRef();

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/chats/${buddy.registration_number}`, { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.ok) setMessages(await res.json());
    } catch (e) { console.log(e); }
  }, [buddy]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  }, [messages.length]);

  const sendMsg = async (content = '', attName = '', attType = '', attData = '') => {
    const textToSend = content || msg.trim();
    if (!textToSend && !attName) return;
    setMsg('');
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Optimistic
    const tempMsg = {
      id: `temp_${Date.now()}`,
      sender_id: currentUser.registration_number,
      receiver_id: buddy.registration_number,
      content: textToSend,
      timestamp: new Date().toISOString(),
      attachment_name: attName,
      attachment_type: attType,
      attachment_data: attData,
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      await fetch(`${API_URL}/chats/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ receiver_id: buddy.registration_number, content: textToSend, attachment_name: attName, attachment_type: attType, attachment_data: attData }),
      });
      fetchMessages();
    } catch (e) { Alert.alert('Error', 'Could not send message'); }
    finally { setSending(false); }
  };

  const pickDocument = async () => {
    setAttachModal(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      const file = result.assets[0];
      if (file.size > 2 * 1024 * 1024) { Alert.alert('File too large', 'Max 2MB per file'); return; }
      const b64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
      sendMsg('', file.name, 'document', b64);
    } catch (e) { console.log(e); }
  };

  const pickImage = async () => {
    setAttachModal(false);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) { Alert.alert('Permission denied'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.5 });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.base64) return;
      sendMsg('', 'image.jpg', 'image', asset.base64);
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

  const myReg = currentUser?.registration_number;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.bg }}>
      {/* HEADER */}
      <View className="flex-row items-center px-4 pt-3 pb-4 border-b" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
        <TouchableOpacity onPress={onBack} className="p-2 rounded-full mr-3" style={{ backgroundColor: theme.bg }}>
          <ArrowLeft size={22} color={theme.icon} />
        </TouchableOpacity>
        <View className="h-11 w-11 rounded-full items-center justify-center mr-3" style={{ backgroundColor: avatarColor(buddy.name) }}>
          <Text className="text-xl font-black text-white">{(buddy.name || '?').charAt(0).toUpperCase()}</Text>
        </View>
        <View className="flex-1">
          <Text className="font-bold text-base" style={{ color: theme.text }}>{buddy.name}</Text>
          <Text className="text-xs" style={{ color: theme.textLight }}>{buddy.branch} · {buddy.registration_number}</Text>
        </View>
      </View>

      {/* MESSAGES */}
      <ScrollView ref={scrollRef} className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
        {messages.length === 0 && (
          <View className="items-center py-12">
            <Text className="text-sm text-center" style={{ color: theme.textLight }}>
              Say hi to {buddy.name}! 👋{'\n'}Messages are end-to-end encrypted.
            </Text>
          </View>
        )}
        {messages.map((m, i) => {
          const isMe = m.sender_id === myReg;
          const time = formatTs(m.timestamp);
          const hasAtt = !!m.attachment_name;
          const isImage = m.attachment_type === 'image';
          const isTemp = m.id?.startsWith('temp_');

          return (
            <Animated.View key={m.id || i} entering={FadeInUp.delay((i % 5) * 20)}
              className={`mb-3 max-w-[78%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
              <TouchableOpacity activeOpacity={0.9} 
                onPress={() => {
                  if (m.attachment_type === 'image') setPreviewImage(`data:image/jpeg;base64,${m.attachment_data}`);
                  else if (m.attachment_type === 'document') openDoc(m);
                }}
                className={`rounded-3xl overflow-hidden ${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                style={{
                  backgroundColor: isMe ? theme.primary : theme.surface,
                  borderWidth: isMe ? 0 : 1,
                  borderColor: theme.border,
                }}>
                {/* Image attachment */}
                {isImage && m.attachment_data ? (
                  <Image source={{ uri: `data:image/jpeg;base64,${m.attachment_data}` }}
                    style={{ width: 220, height: 160 }} resizeMode="cover" />
                ) : hasAtt ? (
                  <View className="flex-row items-center px-4 py-3 space-x-2">
                    <FileText size={22} color={isMe ? 'white' : theme.primary} />
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
                {/* Text content */}
                {m.content ? (
                  <Text className="text-[15px] leading-[22px] font-medium px-4 py-3"
                    style={{ color: isMe ? 'white' : theme.text, paddingTop: hasAtt ? 0 : undefined }}>
                    {m.content}
                  </Text>
                ) : null}
              </TouchableOpacity>
              {/* Time + delivery tick */}
              <View className="flex-row items-center mt-1 space-x-1">
                <Text className="text-[10px]" style={{ color: theme.textLight }}>{time}</Text>
                {isMe && (isTemp
                  ? <Check size={12} color={theme.textLight} />
                  : <CheckCheck size={12} color={theme.primary} />
                )}
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>

      <FullImageModal visible={!!previewImage} imageUri={previewImage} onClose={() => setPreviewImage(null)} theme={theme} />

      {/* INPUT BAR */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View className="flex-row items-end px-4 py-3 border-t pb-6" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          {/* Attach */}
          <TouchableOpacity onPress={() => setAttachModal(true)} className="h-12 w-12 rounded-full items-center justify-center mr-2" style={{ backgroundColor: theme.bg }}>
            <Paperclip size={20} color={theme.textLight} />
          </TouchableOpacity>

          {/* Text input */}
          <View className="flex-1 rounded-3xl px-4 py-3 border min-h-[48px] max-h-[120px] justify-center mr-2" style={{ backgroundColor: theme.bg, borderColor: theme.border }}>
            <TextInput
              value={msg} onChangeText={setMsg}
              placeholder="Message..." placeholderTextColor={theme.textLight}
              style={{ color: theme.text, fontSize: 15 }}
              multiline maxLength={2000}
              onSubmitEditing={() => sendMsg()}
              blurOnSubmit={false}
            />
          </View>

          {/* Send */}
          <TouchableOpacity
            onPress={() => sendMsg()} disabled={!msg.trim() || sending}
            className="h-12 w-12 rounded-full items-center justify-center"
            style={{ backgroundColor: (!msg.trim() || sending) ? `${theme.primary}50` : theme.primary }}>
            {sending ? <ActivityIndicator size="small" color="white" /> : <Send size={20} color="white" style={{ marginLeft: -2 }} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ATTACHMENT PICKER MODAL */}
      <Modal visible={attachModal} transparent animationType="slide" onRequestClose={() => setAttachModal(false)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <TouchableOpacity className="flex-1" onPress={() => setAttachModal(false)} />
          <View className="rounded-t-[32px] p-6" style={{ backgroundColor: theme.surface }}>
            <Text className="font-black text-xl mb-5" style={{ color: theme.text }}>Share</Text>
            <View className="flex-row space-x-4">
              <TouchableOpacity onPress={pickImage} className="flex-1 p-5 rounded-2xl items-center" style={{ backgroundColor: theme.bg }}>
                <Img size={32} color={theme.primary} />
                <Text className="mt-2 font-bold text-sm" style={{ color: theme.text }}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={pickDocument} className="flex-1 p-5 rounded-2xl items-center" style={{ backgroundColor: theme.bg }}>
                <FileText size={32} color={theme.primary} />
                <Text className="mt-2 font-bold text-sm" style={{ color: theme.text }}>Document</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setAttachModal(false); Linking.openURL('https://classroom.google.com').catch(() => Alert.alert('Cannot open', 'Google Classroom not installed.')); }}
                className="flex-1 p-5 rounded-2xl items-center" style={{ backgroundColor: theme.bg }}>
                <Text style={{ fontSize: 32 }}>🎓</Text>
                <Text className="mt-2 font-bold text-sm" style={{ color: theme.text }}>Classroom</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setAttachModal(false)} className="mt-4 h-12 rounded-2xl items-center justify-center" style={{ backgroundColor: `${theme.primary}15` }}>
              <Text className="font-bold" style={{ color: theme.primary }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}