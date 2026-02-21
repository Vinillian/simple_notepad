const fs = require('fs');
const path = require('path');
const db = require('../db'); // подключение к БД

// Путь к файлу с экспортом
const backupPath = path.join(__dirname, '../../backups/notebook_export_2026-02-21.json');

async function importData() {
    try {
        const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

        console.log('Начинаем импорт категорий...');
        for (const cat of data.categories) {
            // Вставляем категории, игнорируя конфликты (если уже есть)
            await db.runAsync(
                `INSERT OR IGNORE INTO categories (id, name, color, custom) VALUES (?, ?, ?, ?)`,
                [cat.id, cat.name, cat.color, cat.custom ? 1 : 0]
            );
        }
        console.log(`Импортировано категорий: ${data.categories.length}`);

        console.log('Начинаем импорт заметок...');
        for (const note of data.notes) {
            // Преобразуем поля
            const metadataStr = note.metadata ? JSON.stringify(note.metadata) : null;
            // Убедимся, что тип есть
            const type = note.type || 'note';

            await db.runAsync(
                `INSERT OR IGNORE INTO notes 
                (id, title, content, category_id, date, created_timestamp, updated_timestamp, expanded, edit_mode, type, metadata) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    note.id,
                    note.title || null,
                    note.content,
                    note.category,
                    note.date,
                    note.createdTimestamp || note.created_timestamp || Date.now(),
                    note.updatedTimestamp || note.updated_timestamp || Date.now(),
                    note.expanded ? 1 : 0,
                    note.editMode ? 1 : 0,
                    type,
                    metadataStr
                ]
            );
        }
        console.log(`Импортировано заметок: ${data.notes.length}`);

        // Импортируем настройки
        if (data.settings) {
            await db.runAsync(
                `UPDATE settings SET sort_order = ?, view_mode = ? WHERE id = 1`,
                [data.settings.sortOrder, data.settings.viewMode]
            );
            console.log('Настройки обновлены');
        }

        console.log('Импорт завершён успешно!');
        db.close();
    } catch (err) {
        console.error('Ошибка импорта:', err);
        db.close();
    }
}

importData();