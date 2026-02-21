const express = require('express');
const cors = require('cors');
const path = require('path');

const db = require('./db'); // подключение к базе данных

// Импорт маршрутов
const notesRoutes = require('./routes/notes');
const categoriesRoutes = require('./routes/categories');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // разрешаем кросс-доменные запросы (фронтенд будет на другом порту)
app.use(express.json()); // парсинг JSON тела запроса

// Подключаем маршруты
app.use('/api/notes', notesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/settings', settingsRoutes);

// Простой тестовый маршрут
app.get('/', (req, res) => {
    res.send('Simple Notepad API is running');
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});