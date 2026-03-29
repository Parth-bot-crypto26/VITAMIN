import React, { useState, useRef, useContext } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import { AppContext } from '../context/AppContext';
import { X, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

export default function VTOPSyncScreen() {
  const { currentUser, authToken, API_URL, theme, fetchUserProfile } = useContext(AppContext);
  const navigation = useNavigation();
  const webviewRef = useRef(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [statusText, setStatusText] = useState('');
  const [statusLog, setStatusLog] = useState([]);

  const addLog = (text) => setStatusLog(prev => [...prev.slice(-8), text]);

  const handleNavigationStateChange = (navState) => {
    console.log("VTOP WebView Navigated to:", navState.url);

    if (navState.url && navState.url.includes('/vtop/content')) {
      if (isSyncing || syncSuccess) return;

      const regNo = (currentUser?.registration_number || '').toUpperCase();

      const js = `
(async function scrapeVTOP() {
    if (window.__vtopScraping) return;
    if (document.getElementById('vtopLoginForm')) {
        console.log('[VTOP] Still on login page');
        return;
    }
    if (!window.location.href.includes('/vtop/content')) {
        console.log('[VTOP] Not on content page');
        return;
    }

    window.__vtopScraping = true;
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SCRAPE_START' }));

    try {
        const regNo = ${JSON.stringify(regNo)};

        // ── CSRF Detection (try all known locations) ──
        let csrf = '';

        const csrfInput = document.querySelector('input[name="_csrf"]');
        if (csrfInput && csrfInput.value) csrf = csrfInput.value;

        if (!csrf) {
            const m = document.querySelector('meta[name="_csrf"]') || document.querySelector('meta[name="csrf-token"]');
            if (m) csrf = m.getAttribute('content') || m.getAttribute('value') || '';
        }

        if (!csrf) {
            document.querySelectorAll('form').forEach(function(f) {
                if (csrf) return;
                const inp = f.querySelector('input[name="_csrf"]');
                if (inp && inp.value) csrf = inp.value;
            });
        }

        if (!csrf) {
            document.querySelectorAll('script').forEach(function(s) {
                if (csrf) return;
                const t = s.textContent || '';
                const match = t.match(/"_csrf"\\s*[,:]\\s*"([a-f0-9\\-]{20,})"/i) ||
                              t.match(/'_csrf'\\s*[,:]\\s*'([a-f0-9\\-]{20,})'/i);
                if (match) csrf = match[1];
            });
        }

        if (!csrf) {
            const cookieParts = document.cookie.split(';');
            for (let i = 0; i < cookieParts.length; i++) {
                const part = cookieParts[i].trim();
                if (part.includes('csrf') || part.includes('CSRF')) {
                    csrf = part.split('=').slice(1).join('=');
                    break;
                }
            }
        }

        const csrfStatus = csrf ? ('found (' + csrf.length + ' chars)') : 'NOT FOUND';
        console.log('[VTOP] regNo=' + regNo + ' csrf=' + csrfStatus);
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'STATUS', text: 'CSRF: ' + csrfStatus }));

        const payload = { timetables: {}, attendance: {}, grades: '' };

        // ── Step 1: Get semester list ──
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'STATUS', text: 'Fetching semester list...' }));
        const ttInitBody = 'verifyMenu=true&authorizedID=' + encodeURIComponent(regNo) +
                           (csrf ? '&_csrf=' + encodeURIComponent(csrf) : '') +
                           '&nocache=' + Date.now();
        const ttInitRes = await fetch('https://vtop.vitbhopal.ac.in/vtop/academics/common/StudentTimeTable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
            body: ttInitBody,
            credentials: 'include'
        });
        const ttHtml = await ttInitRes.text();
        console.log('[VTOP] TT init: ' + ttHtml.length + ' bytes, status=' + ttInitRes.status);

        // Extract CSRF from response if not found yet
        if (!csrf) {
            const csrfMatch = ttHtml.match(/name="_csrf"\\s+value="([^"]+)"/i);
            if (csrfMatch) csrf = csrfMatch[1];
        }

        // Parse semester options
        const semesters = [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(ttHtml, 'text/html');
        const semSelect = doc.getElementById('semesterSubId') ||
                          doc.querySelector('select[name="semesterSubId"]') ||
                          doc.querySelector('select');
        if (semSelect) {
            semSelect.querySelectorAll('option').forEach(function(o) {
                if (o.value && o.value.trim()) semesters.push(o.value.trim());
            });
        }

        console.log('[VTOP] Semesters: ' + JSON.stringify(semesters));
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'STATUS', text: 'Found ' + semesters.length + ' semesters' }));

        if (semesters.length === 0) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SCRAPE_ERROR',
                error: 'No semesters found. Please log into VTOP completely first, then come back to sync.'
            }));
            window.__vtopScraping = false;
            return;
        }

        // Only fetch latest 3 semesters (saves time and bandwidth)
        const semsToFetch = semesters.slice(0, Math.min(semesters.length, 3));

        // ── Step 2: Timetable per semester ──
        for (let i = 0; i < semsToFetch.length; i++) {
            const sem = semsToFetch[i];
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'STATUS', text: 'Timetable ' + (i+1) + '/' + semsToFetch.length }));
            const bodyTT = '_csrf=' + encodeURIComponent(csrf) +
                           '&semesterSubId=' + encodeURIComponent(sem) +
                           '&authorizedID=' + encodeURIComponent(regNo) +
                           '&x=' + encodeURIComponent(new Date().toUTCString());
            const resTT = await fetch('https://vtop.vitbhopal.ac.in/vtop/processViewTimeTable', {
                method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: bodyTT, credentials: 'include'
            });
            payload.timetables[sem] = await resTT.text();
            console.log('[VTOP] TT[' + sem + '] = ' + payload.timetables[sem].length + ' bytes');
        }

        // ── Step 3: Init attendance ──
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'STATUS', text: 'Loading attendance...' }));
        await fetch('https://vtop.vitbhopal.ac.in/vtop/academics/common/StudentAttendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
            body: 'verifyMenu=true&authorizedID=' + encodeURIComponent(regNo) +
                  '&_csrf=' + encodeURIComponent(csrf) + '&nocache=' + Date.now(),
            credentials: 'include'
        });

        // ── Step 4: Attendance per semester ──
        for (let i = 0; i < semsToFetch.length; i++) {
            const sem = semsToFetch[i];
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'STATUS', text: 'Attendance ' + (i+1) + '/' + semsToFetch.length }));
            const bodyAtt = '_csrf=' + encodeURIComponent(csrf) +
                            '&semesterSubId=' + encodeURIComponent(sem) +
                            '&authorizedID=' + encodeURIComponent(regNo) +
                            '&x=' + encodeURIComponent(new Date().toUTCString());
            const resAtt = await fetch('https://vtop.vitbhopal.ac.in/vtop/processViewStudentAttendance', {
                method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: bodyAtt, credentials: 'include'
            });
            payload.attendance[sem] = await resAtt.text();
            console.log('[VTOP] ATT[' + sem + '] = ' + payload.attendance[sem].length + ' bytes');
        }

        // ── Step 5: Grade History ──
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'STATUS', text: 'Fetching grade history...' }));
        const gradeRes = await fetch('https://vtop.vitbhopal.ac.in/vtop/examinations/examGradeView/StudentGradeHistory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
            body: 'verifyMenu=true&authorizedID=' + encodeURIComponent(regNo) +
                  '&_csrf=' + encodeURIComponent(csrf) + '&nocache=' + Date.now(),
            credentials: 'include'
        });
        payload.grades = await gradeRes.text();
        console.log('[VTOP] Grades: ' + payload.grades.length + ' bytes');

        // ── Step 6: Academic Calendar ──
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'STATUS', text: 'Fetching academic calendar...' }));
        try {
            const calRes = await fetch('https://vtop.vitbhopal.ac.in/vtop/processViewCalendar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
                body: 'verifyMenu=true&authorizedID=' + encodeURIComponent(regNo) +
                      '&_csrf=' + encodeURIComponent(csrf) + '&nocache=' + Date.now(),
                credentials: 'include'
            });
            payload.calendar = await calRes.text();
            console.log('[VTOP] Calendar: ' + payload.calendar.length + ' bytes');
        } catch (calErr) {
            console.log('[VTOP] Calendar fetch skipped: ' + calErr.message);
            payload.calendar = '';
        }

        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'STATUS', text: 'Uploading to server...' }));
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOGIN_SUCCESS', payload: payload }));

    } catch (err) {
        console.log('[VTOP] FATAL: ' + err.message);
        window.__vtopScraping = false;
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SCRAPE_ERROR', error: err.message }));
    }
})();
true;
      `;
      webviewRef.current?.injectJavaScript(js);
    }
  };

  const handleMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'SCRAPE_START') {
        setIsSyncing(true);
        setStatusText('Extracting your VTOP data...');
        addLog('🚀 Scrape started');
        return;
      }

      if (data.type === 'STATUS') {
        setStatusText(data.text);
        addLog(data.text);
        return;
      }

      if (data.type === 'SCRAPE_ERROR') {
        Alert.alert("Sync Error", data.error);
        setIsSyncing(false);
        addLog('❌ Error: ' + data.text);
        return;
      }

      if (data.type === 'LOGIN_SUCCESS') {
        const payload = data.payload;
        const numSems = Object.keys(payload?.timetables || {}).length;
        setStatusText(`Uploading ${numSems} semesters to server...`);
        addLog(`📤 Uploading ${numSems} semesters`);

        const res = await fetch(`${API_URL}/schedules/sync-vtop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ payload }),
        });

        const resBody = await res.json();
        if (res.ok) {
          setSyncResult(resBody.details);
          setSyncSuccess(true);
          addLog('✅ Sync complete!');
          // Refresh user data so home screen updates
          await fetchUserProfile(authToken);
          setTimeout(() => { if (navigation.canGoBack()) navigation.goBack(); }, 2500);
        } else {
          Alert.alert("Sync Failed", `Backend error ${res.status}: ${JSON.stringify(resBody).substring(0, 200)}`);
          setIsSyncing(false);
          addLog('❌ Backend error: ' + res.status);
        }
      }
    } catch (e) {
      console.log('[APP] handleMessage error:', e.message);
      setIsSyncing(false);
      Alert.alert("Error", e.message);
    }
  };

  if (syncSuccess) {
    return (
      <View className="flex-1 items-center justify-center p-8" style={{ backgroundColor: theme?.bg || '#09090b' }}>
        <CheckCircle size={80} color="#10B981" />
        <Text className="text-3xl font-black mt-6 text-center" style={{ color: theme?.text || '#fff' }}>Sync Complete!</Text>
        {syncResult && (
          <View className="mt-6 p-5 rounded-2xl border w-full" style={{ backgroundColor: theme?.surface || '#18181b', borderColor: theme?.border || '#333' }}>
            <Text className="font-bold mb-2" style={{ color: theme?.text || '#fff' }}>What was imported:</Text>
            <Text style={{ color: theme?.textLight || '#aaa' }}>📚 {syncResult.schedules} class entries</Text>
            <Text style={{ color: theme?.textLight || '#aaa' }}>📊 {syncResult.grades} grade records</Text>
            <Text style={{ color: theme?.textLight || '#aaa' }}>📅 Current semester: {syncResult.current_semester}</Text>
            <Text style={{ color: theme?.textLight || '#aaa' }}>✅ Avg attendance: {syncResult.avg_attendance?.toFixed(1)}%</Text>
            {syncResult.cgpa > 0 && <Text style={{ color: theme?.textLight || '#aaa' }}>🎓 CGPA: {syncResult.cgpa}</Text>}
          </View>
        )}
        <Text className="text-sm mt-4 text-center" style={{ color: theme?.textLight || '#888' }}>Redirecting back...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 relative" style={{ backgroundColor: theme?.bg || '#09090b' }}>
      {/* Header */}
      <View className="h-[72px] flex-row items-end justify-between px-5 pb-4 border-b" style={{ backgroundColor: theme?.surface || '#18181b', borderColor: theme?.border || '#333' }}>
        <View>
          <Text className="text-lg font-black" style={{ color: theme?.text || '#fff' }}>VTOP Sync</Text>
          <Text className="text-xs" style={{ color: theme?.textLight || '#888' }}>Login to import your academic data</Text>
        </View>
        <View className="flex-row">
          {!isSyncing && (
            <TouchableOpacity onPress={() => webviewRef.current?.reload()} className="p-2 rounded-full border mr-2" style={{ backgroundColor: theme?.bg, borderColor: theme?.border }}>
              <RefreshCw size={18} color={theme?.icon || '#fff'} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 rounded-full border" style={{ backgroundColor: theme?.bg, borderColor: theme?.border }}>
            <X size={18} color={theme?.icon || '#fff'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* WebView */}
      <View className="flex-1 relative">
        <WebView
          ref={webviewRef}
          source={{ uri: 'https://vtop.vitbhopal.ac.in/vtop/open/login' }}
          sharedCookiesEnabled={true}
          onShouldStartLoadWithRequest={(req) => {
            if (req.url === 'about:srcdoc') return false;
            return true;
          }}
          onNavigationStateChange={handleNavigationStateChange}
          onMessage={handleMessage}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: theme?.bg || '#09090b' }}>
              <ActivityIndicator size="large" color={theme?.primary || '#F97316'} />
            </View>
          )}
        />

        {/* Syncing Overlay */}
        {isSyncing && (
          <View style={{ position: 'absolute', inset: 0, backgroundColor: theme?.bg || '#09090b', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 50 }}>
            <ActivityIndicator size="large" color={theme?.primary || '#F97316'} />
            <Text className="text-xl font-black mt-6 mb-2 text-center" style={{ color: theme?.text || '#fff' }}>Syncing Your Data</Text>
            <Text className="text-sm text-center mb-6" style={{ color: theme?.primary || '#F97316' }}>{statusText}</Text>

            <ScrollView style={{ width: '100%', maxHeight: 200 }} contentContainerStyle={{ paddingBottom: 8 }}>
              {statusLog.map((log, i) => (
                <Text key={i} className="text-xs py-1" style={{ color: theme?.textLight || '#aaa', fontFamily: 'monospace' }}>{log}</Text>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}
