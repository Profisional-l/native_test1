// src/services/BleManagerMock.ts
export class BleManager {
  constructor() {
    console.warn('⚠️ BLE Manager is not available in the web browser.');
  }

  startDeviceScan() {}
  stopDeviceScan() {}
  connectToDevice() { throw new Error('BLE not supported in browser'); }
  discoverAllServicesAndCharacteristicsForDevice() {}
  readCharacteristicForDevice() {}
  writeCharacteristicWithResponseForDevice() {}
}
