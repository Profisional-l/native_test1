// src/screens/BookingScreen.tsx
import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootMainParamList } from '../navigation/AppNavigator';
import { api } from '../api';
import { AuthContext } from '../context/AuthContext';

type Props = NativeStackScreenProps<RootMainParamList, 'Booking'>;

interface Room {
  id: number;
  name: string;
  isBooked: boolean;
}

export default function BookingScreen({ navigation }: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { signOut } = useContext(AuthContext);

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      try {
        const response = await api.get<Room[]>('/api/rooms');
        setRooms(response.data);
      } catch (e) {
        console.error('Ошибка загрузки комнат', e);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Доступные номера</Text>

      <FlatList
        data={rooms}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.roomItem}
            onPress={() => navigation.navigate('Room')}
          >
            <Text style={styles.roomName}>{item.name}</Text>
            <Text>
              {item.isBooked ? 'Занят' : 'Свободен'}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text>Нет доступных номеров</Text>}
      />

      <View style={styles.footer}>
        <Button title="Выйти" onPress={signOut} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  roomItem: {
    padding: 15,
    backgroundColor: '#fafafa',
    borderRadius: 8,
    marginBottom: 10,
  },
  roomName: {
    fontSize: 18,
    fontWeight: '500',
  },
  footer: {
    marginTop: 15,
    alignItems: 'center',
  },
});
