// src/context/AuthContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api';

interface AuthContextData {
  userToken: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextData>({
  userToken: null,
  isLoading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          setUserToken(token);
          // @ts-ignore
          global.authToken = token;
        }
      } catch (e) {
        console.error('Error loading token', e);
      } finally {
        setIsLoading(false);
      }
    };
    bootstrap();
  }, []);

  const signIn = async (email: string, password: string) => {
    const response = await api.post('/api/login', { email, password });
    const token = response.data.token;
    await AsyncStorage.setItem('userToken', token);
    setUserToken(token);
    // @ts-ignore
    global.authToken = token;
  };

  const signUp = async (email: string, password: string) => {
    const response = await api.post('/api/register', { email, password });
    const token = response.data.token;
    await AsyncStorage.setItem('userToken', token);
    setUserToken(token);
    // @ts-ignore
    global.authToken = token;
  };

  const signOut = async () => {
    await AsyncStorage.removeItem('userToken');
    setUserToken(null);
    // @ts-ignore
    global.authToken = null;
  };

  const contextValue = useMemo(
    () => ({ userToken, isLoading, signIn, signOut, signUp }),
    [userToken, isLoading]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
