// src/screens/RoomScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootMainParamList } from '../navigation/AppNavigator';
import { ControllerService, State, States } from '../services/ControllerService';

type Props = NativeStackScreenProps<RootMainParamList, 'Room'>;
const controller = new ControllerService();

export default function RoomScreen({ navigation }: Props) {
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);

  // При монтировании пытаемся подключиться по BLE, иначе – TCP fallback
  useEffect(() => {
    (async () => {
      try {
        await controller.connectBLE();
        const s = await controller.getStateBLE();
        setState(s);
      } catch (bleError) {
        console.warn('BLE failed, falling back to TCP', bleError);
        try {
          const s = await controller.getStateTCP();
          setState(s);
        } catch (tcpError) {
          console.error('TCP fallback also failed', tcpError);
          Alert.alert('Ошибка', 'Не удалось получить состояние с контроллера');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Отправка команды и обновление состояния
  const update = async (newState: States) => {
    setLoading(true);
    try {
      try {
        await controller.setStateBLE(newState);
      } catch {
        await controller.setStateTCP(newState);
      }
      // Обновляем состояние
      try {
        const s = await controller.getStateBLE();
        setState(s);
      } catch {
        const s = await controller.getStateTCP();
        setState(s);
      }
    } catch (e) {
      console.error('Update error', e);
      Alert.alert('Ошибка', 'Не удалось отправить команду');
    } finally {
      setLoading(false);
    }
  };

  if (loading || state === null) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Управление номером</Text>

      <View style={styles.row}>
        <Text>Свет</Text>
        <Switch
          value={state.light_on}
          onValueChange={(v) => update(v ? States.LightOn : States.LightOff)}
        />
      </View>

      <View style={styles.row}>
        <Text>Замок (открыт)</Text>
        <Switch
          value={state.door_lock}
          onValueChange={(v) => update(v ? States.DoorLockOpen : States.DoorLockClose)}
        />
      </View>

      <View style={styles.row}>
        <Text>Канал 1</Text>
        <Switch
          value={state.channel_1}
          onValueChange={(v) => update(v ? States.Channel1On : States.Channel1Off)}
        />
      </View>

      <View style={styles.row}>
        <Text>Канал 2</Text>
        <Switch
          value={state.channel_2}
          onValueChange={(v) => update(v ? States.Channel2On : States.Channel2Off)}
        />
      </View>

      <View style={styles.sensors}>
        <Text>Температура: {state.temperature.toFixed(1)} °C</Text>
        <Text>Давление: {state.pressure.toFixed(1)} hPa</Text>
        <Text>Влажность: {state.humidity.toFixed(1)} %</Text>
      </View>

      <View style={styles.footer}>
        <Button title="Назад" onPress={() => navigation.navigate('Booking')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  sensors: { marginTop: 20 },
  footer: { marginTop: 30, alignItems: 'center' },
});
