// src/api.ts
import axios from 'axios';

const getBaseURL = (): string => {
  // В зависимости от среды выбираем адрес вашего сервера

  // 1) Если запускаете в браузере через Expo Web или в iOS Simulator:
  //    (localhost указывает на тот же ПК, где запущен сервер)
  // return 'http://localhost:7000';

  // 2) Если запускаете на Android-эмуляторе (AVD):
  //    Android-эмулятор видит машину-хоста по адресу 10.0.2.2
  // return 'http://10.0.2.2:7000';

  // 3) Если запускаете на физическом устройстве:
  //    узнайте IP-адрес ПК в локальной сети (например, 192.168.1.42)
  // return 'http://192.168.1.42:7000';

  // Раскомментируйте нужную строку ниже:

  return 'http://localhost:7000';
};

export const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 5000,
});

// Перехватчик для подстановки JWT из глобальной переменной
api.interceptors.request.use(config => {
  // @ts-ignore
  const token: string | null = global.authToken;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});
