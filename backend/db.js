const sqlite3 = require('sqlite3');
const path = require('path');

// Определяем путь к файлу базы данных (в папке backend)
const dbPath = path.join(__dirname, 'notepad.db');

// Создаём или открываем базу данных
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
    } else {
        console.log('Подключено к SQLite базе данных:', dbPath);
    }
});

// Функции-обёртки для работы с промисами
db.runAsync = function (sql, params = []) {
    return new Promise((resolve, reject) => {
        this.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

db.getAsync = function (sql, params = []) {
    return new Promise((resolve, reject) => {
        this.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
};

db.allAsync = function (sql, params = []) {
    return new Promise((resolve, reject) => {
        this.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
};

// Инициализация таблиц (создание, если их нет)
db.serialize(() => {
    // Таблица категорий
    db.run(`
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT NOT NULL,
            custom BOOLEAN DEFAULT 1
        )
    `, (err) => {
        if (err) console.error('Ошибка создания таблицы categories:', err.message);
        else console.log('Таблица categories готова');
    });

    // Таблица заметок — поле id сделано REAL для хранения чисел с плавающей точкой
    db.run(`
        CREATE TABLE IF NOT EXISTS notes (
            id REAL UNIQUE NOT NULL,
            title TEXT,
            content TEXT NOT NULL,
            category_id TEXT,
            date TEXT,
            created_timestamp INTEGER,
            updated_timestamp INTEGER,
            expanded BOOLEAN DEFAULT 0,
            edit_mode BOOLEAN DEFAULT 0,
            type TEXT DEFAULT 'note',
            metadata TEXT,
            FOREIGN KEY (category_id) REFERENCES categories(id)
        )
    `, (err) => {
        if (err) console.error('Ошибка создания таблицы notes:', err.message);
        else console.log('Таблица notes готова');
    });

    // Таблица настроек (одна строка)
    db.run(`
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            sort_order TEXT DEFAULT 'new',
            view_mode TEXT DEFAULT 'list'
        )
    `, (err) => {
        if (err) console.error('Ошибка создания таблицы settings:', err.message);
        else {
            console.log('Таблица settings готова');
            // Вставляем настройки по умолчанию, если их нет
            db.run(`INSERT OR IGNORE INTO settings (id, sort_order, view_mode) VALUES (1, 'new', 'list')`);
        }
    });
});

module.exports = db;