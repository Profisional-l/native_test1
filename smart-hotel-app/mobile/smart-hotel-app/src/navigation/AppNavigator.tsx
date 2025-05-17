// src/navigation/AppNavigator.tsx
import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { AuthContext } from '../context/AuthContext';
import SplashScreen from '../screens/SplashScreen';
import AuthScreen from '../screens/AuthScreen';
import RegisterScreen from '../screens/RegisterScreen';
import BookingScreen from '../screens/BookingScreen';
import RoomScreen from '../screens/RoomScreen';

export type RootAuthParamList = {
  Login: undefined;
  Register: undefined;
};

export type RootMainParamList = {
  Booking: undefined;
  Room: undefined;
};

const AuthStack = createNativeStackNavigator<RootAuthParamList>();
const MainStack = createNativeStackNavigator<RootMainParamList>();

export default function AppNavigator() {
  const { userToken, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {userToken == null ? (
        <AuthStack.Navigator initialRouteName="Login">
          <AuthStack.Screen
            name="Login"
            component={AuthScreen}
            options={{ title: 'Вход' }}
          />
          <AuthStack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ title: 'Регистрация' }}
          />
        </AuthStack.Navigator>
      ) : (
        <MainStack.Navigator initialRouteName="Booking">
          <MainStack.Screen
            name="Booking"
            component={BookingScreen}
            options={{ title: 'Бронирование' }}
          />
          <MainStack.Screen
            name="Room"
            component={RoomScreen}
            options={{ title: 'Управление номером' }}
          />
        </MainStack.Navigator>
      )}
    </NavigationContainer>
  );
}
