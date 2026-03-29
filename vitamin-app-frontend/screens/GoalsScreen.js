import React, { useContext, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { AppContext } from '../context/AppContext';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronDown, ChevronUp, Trash2, Edit2, Zap, X, Check, Plus } from 'lucide-react-native';

export default function GoalsScreen() {
  const { currentUser, authToken, API_URL, fetchUserProfile, theme } = useContext(AppContext);

  // goals is either a grouped object {category: []} or raw (null / array from old cache)
  const goalsRaw = currentUser?.goals;
  const goalsObj = (goalsRaw && typeof goalsRaw === 'object' && !Array.isArray(goalsRaw)) ? goalsRaw : {};
  const categories = Object.keys(goalsObj);
  const [expanded, setExpanded] = useState(categories[0] || null);

  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState({ visible: false, id: null, title: '', progress: '0', category: '', isEditing: false });

  const getMotivationalMessage = (cat, goals) => {
    if(!goals || goals.length === 0) return "Add some goals to get started!";
    const avgProgress = goals.reduce((a,b)=>a+b.progress, 0) / goals.length;
    if (avgProgress >= 1) return `Incredible! All ${cat} goals crushed! 🎯`;
    if (avgProgress > 0.7) return `You're crushing your ${cat} goals! Keep it up! 🔥`;
    if (avgProgress > 0.3) return `Making steady progress on ${cat}. Stay focused! 📈`;
    return `Time to kickstart your ${cat} goals! 🚀`;
  };

  const handleEdit = (goal) => {
     setEditModal({ visible: true, id: goal._id || goal.id, title: goal.title, progress: Math.round(goal.progress * 100).toString(), category: goal.category, isEditing: true });
  };
  
  const handleCreate = () => {
     setEditModal({ visible: true, id: null, title: '', progress: '0', category: 'Academic', isEditing: false });
  };

  const saveEdit = async () => {
     if (!editModal.title.trim()) {
       Alert.alert("Error", "Title cannot be empty");
       return;
     }

     setLoading(true);
     try {
       const progressVal = Math.min(100, Math.max(0, parseInt(editModal.progress) || 0)) / 100;
       
       const body = {
         title: editModal.title,
         category: editModal.category || "Academic",
         progress: progressVal,
         streak: 0,
         deadline: "",
         priority: "medium"
       };

       const url = editModal.isEditing ? `${API_URL}/goals/${editModal.id}` : `${API_URL}/goals/`;
       const method = editModal.isEditing ? 'PUT' : 'POST';

       const res = await fetch(url, {
         method,
         headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
         body: JSON.stringify(body)
       });

       if (res.ok) {
         setEditModal({ ...editModal, visible: false });
         await fetchUserProfile(authToken); // refresh data
       } else {
         throw new Error("Failed to save goal");
       }
     } catch(e) {
       Alert.alert("Error", e.message);
     } finally {
       setLoading(false);
     }
  };

  const handleDelete = async (goal) => {
     setLoading(true);
     try {
       const res = await fetch(`${API_URL}/goals/${goal._id || goal.id}`, {
         method: 'DELETE',
         headers: { Authorization: `Bearer ${authToken}` }
       });
       if (res.ok) {
         await fetchUserProfile(authToken);
       } else {
         throw new Error("Failed to delete goal");
       }
     } catch(e) {
       Alert.alert("Error", e.message);
     } finally {
       setLoading(false);
     }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.surface }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <Animated.View entering={FadeInDown.duration(600)} className="mb-4 mt-2 px-6 flex-row justify-between items-center">
           <View>
             <Text className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: theme.textLight }}>Target Tracker</Text>
             <Text className="text-4xl font-bold tracking-tight" style={{ color: theme.text }}>Your Goals</Text>
           </View>
           <TouchableOpacity onPress={handleCreate} className="h-12 w-12 rounded-full items-center justify-center shadow-md" style={{ backgroundColor: theme.primary }}>
              <Plus color="white" size={24} />
           </TouchableOpacity>
        </Animated.View>
        
        {categories.length === 0 && (
          <View className="px-6 py-10 items-center justify-center">
            <Text style={{ color: theme.textLight }} className="text-lg text-center">No goals found. Talk to Coco or click + to add a new goal!</Text>
          </View>
        )}

        <View className="px-6">
        {categories.map((cat, i) => {
          const goals = goalsObj[cat] || [];
          const isCatExpanded = expanded === cat;
          return (
            <Animated.View key={cat} entering={FadeInDown.delay(i * 100)} className="mb-4">
               <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={() => setExpanded(isCatExpanded ? null : cat)} 
                  className="flex-row justify-between items-center p-5 rounded-2xl border"
                  style={{ backgroundColor: isCatExpanded ? theme.primary : theme.bg, borderColor: isCatExpanded ? theme.primary : theme.border, borderRadius: theme.radius, borderWidth: theme.borderWidth, shadowOpacity: theme.shadowOp, shadowRadius: 10, shadowOffset: {width: 0, height: 4}, shadowColor: theme.shadowColor, elevation: theme.elevation }}
               >
                  <Text className="text-xl font-bold" style={{ color: isCatExpanded ? 'white' : theme.text }}>{cat}</Text>
                  {isCatExpanded ? <ChevronUp color="white"/> : <ChevronDown color={theme.icon}/>}
               </TouchableOpacity>
               
               {isCatExpanded && (
                 <View className="mt-3 pl-2">
                    <View className="p-4 rounded-xl mb-4 border border-dashed flex-row items-center" style={{ backgroundColor: `${theme.primary}10`, borderColor: theme.primary, borderRadius: theme.radius, borderWidth: theme.borderWidth }}>
                       <Zap color={theme.primary} size={20} className="mr-3" />
                       <Text className="font-medium flex-1 text-sm" style={{ color: theme.primary }}>{getMotivationalMessage(cat, goals)}</Text>
                    </View>

                    {goals.map((goal, idx) => (
                       <View key={idx} className="p-5 rounded-2xl border mb-3 shadow-sm" style={{ backgroundColor: theme.surface, borderColor: theme.border, borderRadius: theme.radius, borderWidth: theme.borderWidth }}>
                          <View className="flex-row justify-between mb-2">
                            <Text className="font-bold text-lg flex-1 mr-2" style={{ color: theme.text }}>{goal.title}</Text>
                            <Text className="font-bold" style={{ color: theme.primary }}>🔥 {goal.streak || 0}</Text>
                          </View>
                          
                          <View className="h-3 rounded-full overflow-hidden mt-2 mb-3" style={{ backgroundColor: `${theme.primary}20` }}>
                            <View className="h-full" style={{ width: `${(goal.progress || 0) * 100}%`, backgroundColor: theme.primary }}/>
                          </View>
                          
                          <View className="flex-row justify-between items-center mt-1">
                            <Text className="text-xs font-bold" style={{ color: theme.textLight }}>
                               {Math.round((goal.progress || 0) * 100)}% Completed
                            </Text>
                            
                            <View className="flex-row space-x-4">
                               <TouchableOpacity onPress={() => handleEdit(goal)} disabled={loading}>
                                 <Edit2 size={20} color={theme.textLight} />
                               </TouchableOpacity>
                               <TouchableOpacity onPress={() => handleDelete(goal)} disabled={loading}>
                                 <Trash2 size={20} color="#EF4444" />
                               </TouchableOpacity>
                            </View>
                          </View>
                       </View>
                    ))}
                 </View>
               )}
            </Animated.View>
          );
        })}
        </View>
      </ScrollView>

      {/* EDIT MODAL */}
      <Modal visible={editModal.visible} animationType="fade" transparent={true} onRequestClose={() => setEditModal({...editModal, visible: false})}>
         <View className="flex-1 justify-center items-center px-6" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View className="w-full rounded-3xl p-6 shadow-2xl border" style={{ backgroundColor: theme.surface, borderColor: theme.border, borderRadius: theme.radius, borderWidth: theme.borderWidth }}>
               <View className="flex-row justify-between items-center mb-6">
                 <Text className="text-xl font-bold" style={{ color: theme.text }}>{editModal.isEditing ? 'Edit Goal' : 'New Goal'}</Text>
                 <TouchableOpacity onPress={() => setEditModal({...editModal, visible: false})}><X color={theme.icon} size={24}/></TouchableOpacity>
               </View>

               <Text className="text-sm font-bold mb-2 mt-2" style={{ color: theme.textLight }}>Goal Title</Text>
               <View className="rounded-xl border px-4 h-14 justify-center" style={{ backgroundColor: theme.bg, borderColor: theme.border, borderRadius: theme.radius }}>
                 <TextInput value={editModal.title} onChangeText={(t) => setEditModal({...editModal, title: t})} style={{ color: theme.text, fontSize: 16 }} placeholder="e.g. Master Linear Algebra" placeholderTextColor={theme.textLight} />
               </View>
               
               <Text className="text-sm font-bold mb-2 mt-4" style={{ color: theme.textLight }}>Category</Text>
               <View className="rounded-xl border px-4 h-14 justify-center" style={{ backgroundColor: theme.bg, borderColor: theme.border, borderRadius: theme.radius }}>
                 <TextInput value={editModal.category} onChangeText={(t) => setEditModal({...editModal, category: t})} style={{ color: theme.text, fontSize: 16 }} placeholder="e.g. Academic, Career" placeholderTextColor={theme.textLight} />
               </View>

               <Text className="text-sm font-bold mb-2 mt-4" style={{ color: theme.textLight }}>Progress (0-100%)</Text>
               <View className="rounded-xl border px-4 h-14 justify-center" style={{ backgroundColor: theme.bg, borderColor: theme.border, borderRadius: theme.radius }}>
                 <TextInput value={editModal.progress} keyboardType="numeric" onChangeText={(t) => setEditModal({...editModal, progress: t})} style={{ color: theme.text, fontSize: 16 }} />
               </View>

               <TouchableOpacity onPress={saveEdit} disabled={loading} className="mt-8 h-14 rounded-full items-center justify-center flex-row shadow-sm" style={{ backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }}>
                  {loading ? <ActivityIndicator color="white" /> : <Check color="white" size={20} className="mr-2" />}
                  <Text className="text-white font-bold text-lg">{loading ? 'Saving...' : 'Save Changes'}</Text>
               </TouchableOpacity>
            </View>
         </View>
      </Modal>
    </View>
  );
}