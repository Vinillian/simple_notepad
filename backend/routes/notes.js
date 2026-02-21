const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/notes – получение всех заметок с возможностью фильтрации по категории и сортировки
router.get('/', async (req, res) => {
    try {
        const { category, sort } = req.query;
        let sql = `SELECT * FROM notes`;
        const params = [];

        if (category && category !== 'all') {
            sql += ` WHERE category_id = ?`;
            params.push(category);
        }

        sql += ` ORDER BY created_timestamp ${sort === 'old' ? 'ASC' : 'DESC'}`;

        const notes = await db.allAsync(sql, params);

        // Парсим metadata из JSON-строки
        notes.forEach(note => {
            if (note.metadata) {
                try {
                    note.metadata = JSON.parse(note.metadata);
                } catch (e) {
                    note.metadata = null;
                }
            }
            // Преобразуем булевы поля
            note.expanded = !!note.expanded;
            note.edit_mode = !!note.edit_mode;
        });

        res.json(notes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/notes/:id – получение одной заметки
router.get('/:id', async (req, res) => {
    try {
        const note = await db.getAsync(`SELECT * FROM notes WHERE id = ?`, [req.params.id]);
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }
        if (note.metadata) {
            try {
                note.metadata = JSON.parse(note.metadata);
            } catch (e) {
                note.metadata = null;
            }
        }
        note.expanded = !!note.expanded;
        note.edit_mode = !!note.edit_mode;
        res.json(note);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/notes – создание новой заметки
router.post('/', async (req, res) => {
    try {
        const {
            id, title, content, category_id, date,
            created_timestamp, updated_timestamp,
            expanded, edit_mode, type, metadata
        } = req.body;

        // Если id не передан, генерируем на основе времени (как в оригинале)
        const noteId = id || Date.now() + Math.random();

        // Преобразуем metadata в строку JSON для хранения
        const metadataStr = metadata ? JSON.stringify(metadata) : null;

        await db.runAsync(
            `INSERT INTO notes 
             (id, title, content, category_id, date, created_timestamp, updated_timestamp, expanded, edit_mode, type, metadata) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                noteId,
                title || null,
                content,
                category_id,
                date,
                created_timestamp || Date.now(),
                updated_timestamp || Date.now(),
                expanded ? 1 : 0,
                edit_mode ? 1 : 0,
                type || 'note',
                metadataStr
            ]
        );

        res.status(201).json({ id: noteId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/notes/:id – обновление заметки
router.put('/:id', async (req, res) => {
    try {
        const {
            title, content, category_id, date, updated_timestamp,
            expanded, edit_mode, type, metadata
        } = req.body;

        const metadataStr = metadata ? JSON.stringify(metadata) : null;

        const result = await db.runAsync(
            `UPDATE notes SET 
             title = ?, content = ?, category_id = ?, date = ?, updated_timestamp = ?,
             expanded = ?, edit_mode = ?, type = ?, metadata = ?
             WHERE id = ?`,
            [
                title || null,
                content,
                category_id,
                date,
                updated_timestamp || Date.now(),
                expanded ? 1 : 0,
                edit_mode ? 1 : 0,
                type || 'note',
                metadataStr,
                req.params.id
            ]
        );

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Note not found' });
        }

        res.json({ changes: result.changes });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/notes/:id – удаление заметки
router.delete('/:id', async (req, res) => {
    try {
        const result = await db.runAsync(`DELETE FROM notes WHERE id = ?`, [req.params.id]);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Note not found' });
        }
        res.json({ changes: result.changes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;