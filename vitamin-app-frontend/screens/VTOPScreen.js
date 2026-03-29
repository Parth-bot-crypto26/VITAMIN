// screens/VTOPScreen.js
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { User, GraduationCap, AlertCircle, CheckCircle, BookOpen } from 'lucide-react-native';
import { STUDENT } from '../data';

const StyledView = styled(View);
const StyledText = styled(Text);

export default function VTOPScreen() {
  return (
    <StyledView className="flex-1 bg-[#09090b] pt-16 px-5">
      
      {/* HEADER */}
      <StyledView className="mb-6">
        <StyledText className="text-zinc-500 text-xs font-bold tracking-widest uppercase mb-1">Academic Record</StyledText>
        <StyledText className="text-white text-3xl font-bold">VTOP Profile</StyledText>
      </StyledView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        
        {/* 1. STUDENT ID CARD */}
        <StyledView className="bg-zinc-900/80 border border-white/10 p-5 rounded-3xl mb-4 flex-row items-center space-x-4">
           <StyledView className="h-16 w-16 bg-zinc-800 rounded-full items-center justify-center border border-zinc-700">
              <User size={30} color="white" />
           </StyledView>
           <StyledView>
              <StyledText className="text-white text-xl font-bold">{STUDENT.name}</StyledText>
              <StyledText className="text-zinc-400 text-sm">{STUDENT.regNo} • {STUDENT.program}</StyledText>
              <StyledText className="text-orange-500 text-xs font-bold mt-1">{STUDENT.branch}</StyledText>
           </StyledView>
        </StyledView>

        {/* 2. ACADEMIC STATS (CGPA & CREDITS) */}
        <StyledView className="flex-row justify-between mb-4">
           {/* CGPA */}
           <StyledView className="w-[48%] bg-zinc-900/50 border border-white/10 p-5 rounded-3xl justify-between">
              <StyledView className="bg-blue-500/10 self-start p-2 rounded-lg mb-2">
                 <GraduationCap size={20} color="#3b82f6" />
              </StyledView>
              <StyledView>
                 <StyledText className="text-zinc-500 text-xs uppercase font-bold">Current CGPA</StyledText>
                 <StyledText className="text-white text-4xl font-bold tracking-tight">{STUDENT.academic.cgpa}</StyledText>
              </StyledView>
           </StyledView>

           {/* CREDITS */}
           <StyledView className="w-[48%] bg-zinc-900/50 border border-white/10 p-5 rounded-3xl justify-between">
              <StyledView>
                 <StyledText className="text-zinc-500 text-xs uppercase font-bold mb-1">Credit Status</StyledText>
                 <StyledText className="text-white text-2xl font-bold">{STUDENT.academic.credits.earned} <StyledText className="text-zinc-600 text-sm">/ {STUDENT.academic.credits.required}</StyledText></StyledText>
              </StyledView>
              {/* Progress Bar */}
              <StyledView className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden mt-2">
                 <StyledView className="h-full bg-green-500 rounded-full" style={{ width: `${STUDENT.academic.credits.percentage}%` }} />
              </StyledView>
           </StyledView>
        </StyledView>

        {/* 3. PROCTOR INFO */}
        <StyledView className="bg-zinc-900/50 border border-white/10 p-5 rounded-3xl mb-6">
           <StyledText className="text-zinc-500 text-xs uppercase font-bold mb-3">Faculty Proctor</StyledText>
           <StyledView className="flex-row items-center justify-between">
              <StyledView className="flex-row items-center space-x-3">
                 <StyledView className="h-10 w-10 bg-zinc-800 rounded-full items-center justify-center">
                    <User size={18} color="#a1a1aa" />
                 </StyledView>
                 <StyledView>
                    <StyledText className="text-white font-bold">{STUDENT.proctor.name}</StyledText>
                    <StyledText className="text-zinc-500 text-xs">{STUDENT.proctor.cabin}</StyledText>
                 </StyledView>
              </StyledView>
              <TouchableOpacity className="bg-white px-4 py-2 rounded-lg">
                 <StyledText className="text-black text-xs font-bold">Message</StyledText>
              </TouchableOpacity>
           </StyledView>
        </StyledView>

        {/* 4. COURSE LIST (The Table Replacement) */}
        <StyledText className="text-white text-lg font-bold mb-4">Winter Semester 2025-26</StyledText>
        
        {STUDENT.academic.history.map((course, index) => (
           <StyledView key={index} className="bg-zinc-900/30 border border-white/5 p-4 rounded-2xl mb-3 flex-row justify-between items-center">
              <StyledView className="flex-1 mr-4">
                 <StyledText className="text-zinc-500 text-[10px] font-mono mb-1">{course.code} • {course.type}</StyledText>
                 <StyledText className="text-white font-bold leading-5" numberOfLines={1}>{course.name}</StyledText>
              </StyledView>
              
              <StyledView className="items-end">
                 <StyledView className={`flex-row items-center space-x-1 px-2 py-1 rounded-md mb-1 ${course.attendance < 75 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                    {course.attendance < 75 ? <AlertCircle size={10} color="#ef4444" /> : <CheckCircle size={10} color="#22c55e" />}
                    <StyledText className={`text-xs font-bold ${course.attendance < 75 ? 'text-red-500' : 'text-green-500'}`}>{course.attendance}%</StyledText>
                 </StyledView>
                 <StyledText className="text-zinc-600 text-[10px]">{course.remark}</StyledText>
              </StyledView>
           </StyledView>
        ))}

      </ScrollView>
    </StyledView>
  );
}