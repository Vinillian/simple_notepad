const fs = require('fs');
const path = require('path');
const db = require('../db'); // подключение к БД

// Путь к JSON-файлу (можно изменить или передавать как аргумент)
const backupPath = path.join(__dirname, '../../backups/notebook_export_2026-02-26.json');

async function replaceData() {
    try {
        // 1. Читаем и парсим JSON
        const rawData = fs.readFileSync(backupPath, 'utf8');
        const data = JSON.parse(rawData);

        console.log('Начинаем полную замену данных...');

        // 2. Начинаем транзакцию для целостности
        await db.runAsync('BEGIN TRANSACTION');

        // 3. Очищаем существующие таблицы (сначала notes из-за внешнего ключа)
        console.log('Очищаем таблицы...');
        await db.runAsync('DELETE FROM notes');
        await db.runAsync('DELETE FROM categories');
        console.log('Таблицы очищены.');

        // 4. Вставляем категории (кроме системной "all")
        console.log('Вставляем категории...');
        for (const cat of data.categories) {
            // Пропускаем виртуальную категорию "all" – она не хранится в БД
            if (cat.id === 'all') continue;

            await db.runAsync(
                `INSERT INTO categories (id, name, color, custom) VALUES (?, ?, ?, ?)`,
                [cat.id, cat.name, cat.color, cat.custom ? 1 : 0]
            );
        }
        console.log(`Категорий вставлено: ${data.categories.filter(c => c.id !== 'all').length}`);

        // 5. Вставляем заметки
        console.log('Вставляем заметки...');
        for (const note of data.notes) {
            // Подготовка полей
            const metadata = note.metadata ? JSON.stringify(note.metadata) : null;
            const type = note.type || 'note'; // на случай отсутствия поля
            const expanded = note.expanded ? 1 : 0;
            const editMode = note.editMode ? 1 : 0;
            const categoryId = note.category; // в JSON поле называется category

            await db.runAsync(
                `INSERT INTO notes 
                (id, title, content, category_id, date, created_timestamp, updated_timestamp, expanded, edit_mode, type, metadata) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    note.id,
                    note.title || null,
                    note.content,
                    categoryId,
                    note.date,
                    note.createdTimestamp || note.created_timestamp || Date.now(),
                    note.updatedTimestamp || note.updated_timestamp || Date.now(),
                    expanded,
                    editMode,
                    type,
                    metadata
                ]
            );
        }
        console.log(`Заметок вставлено: ${data.notes.length}`);

        // 6. Обновляем настройки (таблица settings всегда содержит одну строку с id=1)
        if (data.settings) {
            await db.runAsync(
                `UPDATE settings SET sort_order = ?, view_mode = ? WHERE id = 1`,
                [data.settings.sortOrder, data.settings.viewMode]
            );
            console.log('Настройки обновлены.');
        }

        // 7. Фиксируем транзакцию
        await db.runAsync('COMMIT');
        console.log('Замена данных успешно завершена!');

    } catch (err) {
        // В случае ошибки откатываем изменения
        await db.runAsync('ROLLBACK');
        console.error('Ошибка при замене данных:', err);
    } finally {
        db.close();
    }
}

replaceData();