const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'notepad.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
    } else {
        console.log('Подключено к SQLite базе данных:', dbPath);
    }
});

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
    db.run(`
        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT NOT NULL,
            custom BOOLEAN DEFAULT 1,
            updated_timestamp INTEGER NOT NULL DEFAULT 0,
            deleted INTEGER NOT NULL DEFAULT 0
        )
    `, (err) => {
        if (err) console.error('Ошибка создания таблицы categories:', err.message);
        else console.log('Таблица categories готова');
    });

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
            deleted INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (category_id) REFERENCES categories(id)
        )
    `, (err) => {
        if (err) console.error('Ошибка создания таблицы notes:', err.message);
        else console.log('Таблица notes готова');
    });

    // Older databases have no `deleted` column (tombstones for deleted notes).
    db.all(`PRAGMA table_info(notes)`, (err, columns) => {
        if (err) {
            console.error('Ошибка чтения структуры таблицы notes:', err.message);
            return;
        }
        if (!columns.some(column => column.name === 'deleted')) {
            db.run(`ALTER TABLE notes ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0`, (alterErr) => {
                if (alterErr) console.error('Ошибка добавления колонки notes.deleted:', alterErr.message);
                else console.log('Колонка notes.deleted добавлена');
            });
        }
    });

    // Older databases have no `updated_timestamp` and `deleted` columns in categories
    // (tombstones for deleted categories).
    db.all(`PRAGMA table_info(categories)`, (err, columns) => {
        if (err) {
            console.error('Ошибка чтения структуры таблицы categories:', err.message);
            return;
        }
        const addColumn = (name, definition) => {
            if (columns.some(column => column.name === name)) return;
            db.run(`ALTER TABLE categories ADD COLUMN ${name} ${definition}`, (alterErr) => {
                if (alterErr) console.error(`Ошибка добавления колонки categories.${name}:`, alterErr.message);
                else console.log(`Колонка categories.${name} добавлена`);
            });
        };
        addColumn('updated_timestamp', 'INTEGER NOT NULL DEFAULT 0');
        addColumn('deleted', 'INTEGER NOT NULL DEFAULT 0');
    });

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
            db.run(`INSERT OR IGNORE INTO settings (id, sort_order, view_mode) VALUES (1, 'new', 'list')`);
        }
    });
});

module.exports = db;