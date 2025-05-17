import { Platform } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import TcpSocket from 'react-native-tcp-socket';
import { Buffer } from 'buffer';

// Тип состояния устройства
export type State = {
  light_on: boolean;
  door_lock: boolean;
  channel_1: boolean;
  channel_2: boolean;
  temperature: number;
  pressure: number;
  humidity: number;
};

// Команды для устройства
export enum States {
  LightOn = 0,
  LightOff = 1,
  DoorLockOpen = 2,
  DoorLockClose = 3,
  Channel1On = 4,
  Channel1Off = 5,
  Channel2On = 6,
  Channel2Off = 7,
}

// UUID сервисов и характеристик BLE
const SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
const CHAR_IDENTIFY = '0000ff02-0000-1000-8000-00805f9b34fb';
const CHAR_SET_STATE = '0000fff1-0000-1000-8000-00805f9b34fb';
const CHAR_GET_STATE = '0000fff2-0000-1000-8000-00805f9b34fb';

// Параметры TCP
const DEVICE_NAME = 'ROOM_7';
const TCP_HOST = '192.168.1.100';
const TCP_PORT = 7000;
const AUTH_TOKEN = 'CM6wqJB5blIMvBKQ';

export class ControllerService {
  private manager: BleManager | null = null;
  private device: Device | null = null;

  // Флаг — доступен ли BLE на платформе
  private BLE_ENABLED = Platform.OS === 'ios' || Platform.OS === 'android';

  constructor() {
    if (this.BLE_ENABLED) {
      this.manager = new BleManager();
      console.log('✅ BLE Manager initialized');
    } else {
      this.manager = null;
      console.log('⚠️ BLE not supported on this platform, using TCP fallback');
    }
  }

  // Подключение по BLE (если поддерживается)
  async connectBLE(): Promise<void> {
    if (!this.BLE_ENABLED || !this.manager) {
      throw new Error('BLE не поддерживается на этой платформе');
    }

    console.log('🔄 Scanning for BLE devices...');
    return new Promise((resolve, reject) => {
      this.manager!.startDeviceScan(null, null, async (error, device) => {
        if (error) {
          console.error('❌ BLE Scan Error:', error);
          reject(error);
          return;
        }

        if (device && device.name === DEVICE_NAME) {
          console.log(`🔗 Found device: ${DEVICE_NAME}`);
          this.manager!.stopDeviceScan();
          try {
            const connected = await device.connect();
            await connected.discoverAllServicesAndCharacteristics();
            this.device = connected;
            console.log('✅ Connected to BLE device.');

            // Отправляем IdentifyRequest
            await this.writeCharacteristic(CHAR_IDENTIFY, AUTH_TOKEN);
            console.log('🔑 Authentication successful.');
            resolve();
          } catch (e) {
            console.error('❌ BLE Connection Error:', e);
            reject(e);
          }
        }
      });
    });
  }

  // Получение состояния по BLE
  async getStateBLE(): Promise<State> {
    if (!this.BLE_ENABLED || !this.device) {
      throw new Error('BLE устройство не подключено или BLE отключен');
    }

    try {
      const char = await this.device.readCharacteristicForService(SERVICE_UUID, CHAR_GET_STATE);
      const data = Buffer.from(char.value!, 'base64');
      const obj = JSON.parse(data.toString());

      return {
        light_on: obj.light_on,
        door_lock: obj.door_lock,
        channel_1: obj.channel_1,
        channel_2: obj.channel_2,
        temperature: obj.temperature,
        pressure: obj.pressure,
        humidity: obj.humidity,
      };
    } catch (error) {
      console.error('❌ Error reading BLE state:', error);
      throw error;
    }
  }

  // Отправка команды по BLE
  async setStateBLE(state: States): Promise<boolean> {
    if (!this.BLE_ENABLED || !this.device) {
      throw new Error('BLE устройство не подключено или BLE отключен');
    }

    try {
      const buf = Buffer.from(JSON.stringify({ set_state: state }));
      await this.device.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CHAR_SET_STATE,
        buf.toString('base64')
      );
      console.log('📤 Sent BLE state:', state);
      return true;
    } catch (error) {
      console.error('❌ Error setting BLE state:', error);
      throw error;
    }
  }

  // Запись в характеристику BLE (вспомогательная)
  private async writeCharacteristic(charUUID: string, value: string) {
    if (!this.BLE_ENABLED || !this.device) {
      throw new Error('BLE устройство не подключено или BLE отключен');
    }

    const buffer = Buffer.from(value);
    await this.device.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      charUUID,
      buffer.toString('base64')
    );
  }

  // Получение состояния по TCP (fallback)
  async getStateTCP(): Promise<State> {
    console.log('🌐 Fetching state via TCP...');
    return new Promise((resolve, reject) => {
      const client = TcpSocket.createConnection({ host: TCP_HOST, port: TCP_PORT }, () => {
        const msg = { identify: AUTH_TOKEN, get_state: {} };
        client.write(JSON.stringify(msg));
      });

      client.on('data', (data) => {
        client.destroy();
        try {
          const obj = JSON.parse(data.toString());
          resolve({
            light_on: obj.state.light_on,
            door_lock: obj.state.door_lock,
            channel_1: obj.state.channel_1,
            channel_2: obj.state.channel_2,
            temperature: obj.state.temperature,
            pressure: obj.state.pressure,
            humidity: obj.state.humidity,
          });
        } catch (e) {
          console.error('❌ TCP Data Parse Error:', e);
          reject(e);
        }
      });

      client.on('error', (error) => {
        console.error('❌ TCP Connection Error:', error);
        reject(error);
      });
    });
  }

  // Отправка команды по TCP (fallback)
  async setStateTCP(state: States): Promise<boolean> {
    console.log('🌐 Sending state via TCP...');
    return new Promise((resolve, reject) => {
      const client = TcpSocket.createConnection({ host: TCP_HOST, port: TCP_PORT }, () => {
        const msg = { identify: AUTH_TOKEN, set_state: state };
        client.write(JSON.stringify(msg));
      });

      client.on('data', () => {
        client.destroy();
        console.log('📤 Sent TCP state:', state);
        resolve(true);
      });

      client.on('error', (error) => {
        console.error('❌ TCP Connection Error:', error);
        reject(error);
      });
    });
  }

  // Удобный метод: получить состояние — сначала через BLE, иначе через TCP
  async getState(): Promise<State> {
    if (this.BLE_ENABLED) {
      try {
        return await this.getStateBLE();
      } catch (e) {
        console.warn('⚠️ BLE getState failed, fallback to TCP', e);
      }
    }
    return this.getStateTCP();
  }

  // Удобный метод: отправить состояние — сначала через BLE, иначе через TCP
  async setState(state: States): Promise<boolean> {
    if (this.BLE_ENABLED) {
      try {
        return await this.setStateBLE(state);
      } catch (e) {
        console.warn('⚠️ BLE setState failed, fallback to TCP', e);
      }
    }
    return this.setStateTCP(state);
  }
}
