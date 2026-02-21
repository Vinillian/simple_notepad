const express = require('express');
const cors = require('cors');
const config = require('./config');
const db = require('./db');

// Импорт маршрутов
const notesRoutes = require('./routes/notes');
const categoriesRoutes = require('./routes/categories');
const settingsRoutes = require('./routes/settings');

// Импорт Swagger
const setupSwagger = require('./swagger');

const app = express();
const PORT = config.port;

app.use(cors());
app.use(express.json());

// Подключаем Swagger
setupSwagger(app);

// Маршруты API
app.use('/api/notes', notesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/', (req, res) => {
    res.send('Simple Notepad API is running');
});

// 404 - обработка несуществующих маршрутов (без указания пути)
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Централизованный обработчик ошибок
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.isOperational ? err.message : 'Internal Server Error';
    console.error(err.stack);
    res.status(statusCode).json({ error: message });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});