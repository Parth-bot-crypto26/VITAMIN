import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import { styled } from 'nativewind';
import { AppContext } from '../context/AppContext';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function LoginScreen() {
  const { login, register } = useContext(AppContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('');
  
  return (
    <View className="flex-1 bg-bg justify-center px-8">
       <Animated.View entering={FadeInDown.duration(800)}>
         {/* BLACK LOGO CONTAINER */}
         <View className="bg-black h-32 w-32 rounded-3xl items-center justify-center mb-8 self-start shadow-xl">
            <Image source={require('../assets/images/logo.png')} className="h-20 w-20" resizeMode="contain" />
         </View>
         
         <Text className="text-black text-5xl font-bold tracking-tighter mb-2">VITamin</Text>
         <Text className="text-gray-500 text-lg mb-8">{isRegister ? "Create a Vitamin account." : "Login to sync VTOP."}</Text>

         {isRegister && (
            <>
               <TextInput 
                 className="bg-white p-4 rounded-2xl border border-gray-200 mb-4 text-lg"
                 placeholder="Full Name"
                 placeholderTextColor="#9ca3af" 
                 value={name} onChangeText={setName}
               />
               <TextInput 
                 className="bg-white p-4 rounded-2xl border border-gray-200 mb-4 text-lg"
                 placeholder="Branch (e.g. CSE)" 
                 placeholderTextColor="#9ca3af"
                 value={branch} onChangeText={setBranch}
               />
            </>
         )}

         <TextInput 
           className="bg-white p-4 rounded-2xl border border-gray-200 mb-4 text-lg"
           placeholder="Reg Number (e.g. 23BAI10120)" 
           placeholderTextColor="#9ca3af"
           value={username} onChangeText={(text) => setUsername(text.toUpperCase())} autoCapitalize="characters"
         />
         <TextInput 
           className="bg-white p-4 rounded-2xl border border-gray-200 mb-6 text-lg"
           placeholder="Password" 
           placeholderTextColor="#9ca3af"
           secureTextEntry
           value={password} onChangeText={setPassword}
         />
         
         <TouchableOpacity 
            onPress={() => isRegister ? register(username, password, name, branch) : login(username, password)} 
            className="bg-black h-16 rounded-2xl items-center justify-center mb-4"
         >
            <Text className="text-white font-bold text-xl">{isRegister ? "Register" : "Connect"}</Text>
         </TouchableOpacity>
         
         <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
            <Text className="text-center text-gray-500 font-medium">
               {isRegister ? "Already have an account? Login here" : "Don't have an account? Register here"}
            </Text>
         </TouchableOpacity>
       </Animated.View>
    </View>
  );
}