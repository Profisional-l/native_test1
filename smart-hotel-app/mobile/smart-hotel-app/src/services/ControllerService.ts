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

// BLE UUID
const SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
const CHAR_IDENTIFY = '0000ff02-0000-1000-8000-00805f9b34fb';
const CHAR_SET_STATE = '0000fff1-0000-1000-8000-00805f9b34fb';
const CHAR_GET_STATE = '0000fff2-0000-1000-8000-00805f9b34fb';

// TCP параметры
const DEVICE_NAME = 'ROOM_7';
const TCP_HOST = '192.168.1.100';
const TCP_PORT = 7000;
const AUTH_TOKEN = 'CM6wqJB5blIMvBKQ';

// Проверка платформы
const IS_ANDROID_OR_IOS = Platform.OS === 'android' || Platform.OS === 'ios';
const IS_WEB = Platform.OS === 'web';

export class ControllerService {
  private manager: BleManager | null = null;
  private device: Device | null = null;
  private tcpClient: any = null;
  private BLE_ENABLED = IS_ANDROID_OR_IOS;

  constructor() {
    if (this.BLE_ENABLED) {
      this.manager = new BleManager();
      this.setupBLEListeners();
      console.log('✅ BLE Manager initialized');
    } else {
      console.log('⚠️ BLE disabled or not supported on this platform');
    }
  }

  private setupBLEListeners() {
    if (!this.manager) return;

    this.manager.onStateChange((state) => {
      console.log(`BLE state changed: ${state}`);
      if (state === 'PoweredOff') {
        console.warn('Bluetooth is turned off!');
      }
    }, true);
  }

  // Подключение BLE
  async connectBLE(): Promise<void> {
    if (!this.BLE_ENABLED || !this.manager) {
      throw new Error('BLE не поддерживается на этой платформе');
    }

    console.log('🔄 Scanning for BLE devices...');
    return new Promise((resolve, reject) => {
      let scanTimeout: ReturnType<typeof setTimeout>;

      const scanSubscription = this.manager!.onStateChange(async (state) => {
        if (state === 'PoweredOn') {
          scanSubscription.remove();
          this.startDeviceScan(resolve, reject, scanTimeout);
        }
      }, true);

      scanTimeout = setTimeout(() => {
        scanSubscription.remove();
        this.manager!.stopDeviceScan();
        reject(new Error('BLE устройство не найдено (timeout)'));
      }, 15000);
    });
  }

  private async startDeviceScan(
    resolve: () => void,
    reject: (error: Error) => void,
    scanTimeout: ReturnType<typeof setTimeout>
  ) {
    this.manager!.startDeviceScan(null, null, async (error, device) => {
      if (error) {
        clearTimeout(scanTimeout);
        reject(error);
        return;
      }

      if (device?.name === DEVICE_NAME) {
        clearTimeout(scanTimeout);
        this.manager!.stopDeviceScan();
        try {
          const connected = await device.connect();
          await connected.discoverAllServicesAndCharacteristics();
          this.device = connected;
          console.log('✅ Connected to BLE device');

          await this.writeCharacteristic(CHAR_IDENTIFY, AUTH_TOKEN);
          console.log('🔑 Authentication sent');
          resolve();
        } catch (e) {
          reject(e as Error);
        }
      }
    });
  }

  private async writeCharacteristic(charUUID: string, value: string) {
    if (!this.device) throw new Error('BLE устройство не подключено');
    const buf = Buffer.from(value, 'utf-8');
    await this.device.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      charUUID,
      buf.toString('base64')
    );
  }

  async getStateBLE(): Promise<State> {
    if (!this.device) throw new Error('BLE устройство не подключено');

    try {
      const char = await this.device.readCharacteristicForService(
        SERVICE_UUID,
        CHAR_GET_STATE
      );

      if (!char.value) throw new Error('Пустое значение характеристики');

      const data = Buffer.from(char.value, 'base64').toString('utf-8');
      const obj = JSON.parse(data);

      return this.normalizeState(obj);
    } catch (error) {
      console.error('❌ BLE getState error:', error);
      throw error;
    }
  }

  async setStateBLE(state: States): Promise<boolean> {
    if (!this.device) throw new Error('BLE устройство не подключено');

    try {
      const payload = JSON.stringify({ set_state: state });
      await this.writeCharacteristic(CHAR_SET_STATE, payload);
      console.log('📤 BLE setState sent:', state);
      return true;
    } catch (error) {
      console.error('❌ BLE setState error:', error);
      throw error;
    }
  }

  async getStateTCP(): Promise<State> {
    if (IS_WEB) {
      throw new Error('TCP не поддерживается в веб-окружении');
    }

    console.log('🌐 Connecting via TCP to get state...');
    return new Promise((resolve, reject) => {
      const client = TcpSocket.createConnection(
        { host: TCP_HOST, port: TCP_PORT },
        () => {
          const msg = { identify: AUTH_TOKEN, get_state: {} };
          client.write(JSON.stringify(msg));
        }
      );

      const handleError = (err: Error) => {
        client.destroy();
        reject(err);
      };

      client.on('data', (data: any) => {
        try {
          client.destroy();

          let strData: string;
          if (typeof data === 'string') {
            strData = data;
          } else if (Buffer.isBuffer(data)) {
            strData = data.toString('utf-8');
          } else {
            throw new Error('Неизвестный тип данных в TCP ответе');
          }

          const obj = JSON.parse(strData);
          if (!obj.state) {
            throw new Error('В ответе нет поля state');
          }
          resolve(this.normalizeState(obj.state));
        } catch (e) {
          handleError(new Error('Ошибка разбора ответа TCP: ' + (e as Error).message));
        }
      });

      client.on('error', (err: Error) => {
        handleError(new Error('TCP ошибка: ' + err.message));
      });

      client.on('timeout', () => {
        handleError(new Error('TCP соединение прервано по таймауту'));
      });
    });
  }

  async setStateTCP(state: States): Promise<boolean> {
    if (IS_WEB) {
      throw new Error('TCP не поддерживается в веб-окружении');
    }

    console.log('🌐 Connecting via TCP to set state...');
    return new Promise((resolve, reject) => {
      const client = TcpSocket.createConnection(
        { host: TCP_HOST, port: TCP_PORT },
        () => {
          const msg = { identify: AUTH_TOKEN, set_state: state };
          client.write(JSON.stringify(msg));
        }
      );

      const handleError = (err: Error) => {
        client.destroy();
        reject(err);
      };

      client.on('data', () => {
        client.destroy();
        resolve(true);
      });

      client.on('error', (err: Error) => {
        handleError(new Error('TCP ошибка: ' + err.message));
      });

      client.on('timeout', () => {
        handleError(new Error('TCP соединение прервано по таймауту'));
      });
    });
  }

  private normalizeState(obj: any): State {
    return {
      light_on: Boolean(obj.light_on),
      door_lock: Boolean(obj.door_lock),
      channel_1: Boolean(obj.channel_1),
      channel_2: Boolean(obj.channel_2),
      temperature: Number(obj.temperature) || 0,
      pressure: Number(obj.pressure) || 0,
      humidity: Number(obj.humidity) || 0,
    };
  }

  async disconnectBLE(): Promise<void> {
    if (this.device) {
      try {
        await this.device.cancelConnection();
        this.device = null;
        console.log('✅ BLE device disconnected');
      } catch (e) {
        console.warn('⚠️ Ошибка при отключении BLE:', e);
      }
    }
  }

  async cleanup() {
    await this.disconnectBLE();
    if (this.manager) {
      this.manager.destroy();
      this.manager = null;
    }
  }
}
