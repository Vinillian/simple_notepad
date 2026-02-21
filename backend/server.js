const express = require('express');
const cors = require('cors');
const config = require('./config'); // конфигурация (порт и т.д.)
const db = require('./db'); // подключение к базе данных (оставляем как есть)

// Импорт маршрутов
const notesRoutes = require('./routes/notes');
const categoriesRoutes = require('./routes/categories');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = config.port;

// Middleware
app.use(cors()); // разрешаем кросс-доменные запросы
app.use(express.json()); // парсинг JSON тела запроса

// Подключаем маршруты API
app.use('/api/notes', notesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/settings', settingsRoutes);

// Простой тестовый маршрут
app.get('/', (req, res) => {
    res.send('Simple Notepad API is running');
});

// Обработка 404 для несуществующих маршрутов
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Централизованный обработчик ошибок
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.isOperational ? err.message : 'Internal Server Error';
    // Логируем ошибку (в реальном проекте можно использовать Winston или другой логгер)
    console.error(`[Error] ${err.stack}`);
    res.status(statusCode).json({ error: message });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});