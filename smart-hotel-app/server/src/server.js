// src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 7000;
const JWT_SECRET = process.env.JWT_SECRET;

// Хранилище пользователей в памяти
// В продакшене замените на БД (Postgres, Mongo и т.п.)
const users = [];

// Заглушка списка комнат
const rooms = [
  { id: 101, name: 'Номер 101', isBooked: false },
  { id: 102, name: 'Номер 102', isBooked: true  },
  { id: 103, name: 'Номер 103', isBooked: false },
];

// Регистрация
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email и пароль обязательны' });
  }
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ message: 'Пользователь уже существует' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = { id: users.length + 1, email, passwordHash: hash };
    users.push(user);
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Вход
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ message: 'Неверный email или пароль' });
  }
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ message: 'Неверный email или пароль' });
  }
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

// Middleware для проверки JWT
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Требуется авторизация' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: 'Неверный токен' });
  }
}

// Получить список комнат (только для авторизованных)
app.get('/api/rooms', authenticate, (req, res) => {
  res.json(rooms);
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
