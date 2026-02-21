const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/categories – все категории
router.get('/', async (req, res) => {
    try {
        const categories = await db.allAsync(`SELECT * FROM categories`);
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/categories/:id – одна категория
router.get('/:id', async (req, res) => {
    try {
        const category = await db.getAsync(`SELECT * FROM categories WHERE id = ?`, [req.params.id]);
        if (!category) return res.status(404).json({ error: 'Category not found' });
        res.json(category);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/categories – создание категории
router.post('/', async (req, res) => {
    try {
        const { id, name, color, custom } = req.body;
        if (!id || !name || !color) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await db.runAsync(
            `INSERT INTO categories (id, name, color, custom) VALUES (?, ?, ?, ?)`,
            [id, name, color, custom ? 1 : 0]
        );

        res.status(201).json({ id });
    } catch (err) {
        // Если нарушение уникальности id – вернуть 409
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Category with this id already exists' });
        }
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/categories/:id – обновление категории
router.put('/:id', async (req, res) => {
    try {
        const { name, color, custom } = req.body;
        const result = await db.runAsync(
            `UPDATE categories SET name = ?, color = ?, custom = ? WHERE id = ?`,
            [name, color, custom ? 1 : 0, req.params.id]
        );
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json({ changes: result.changes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/categories/:id – удаление категории
router.delete('/:id', async (req, res) => {
    try {
        // Проверим, есть ли заметки в этой категории
        const notesCount = await db.getAsync(
            `SELECT COUNT(*) as count FROM notes WHERE category_id = ?`,
            [req.params.id]
        );

        if (notesCount.count > 0) {
            return res.status(409).json({ 
                error: 'Cannot delete category with existing notes',
                notesCount: notesCount.count 
            });
        }

        const result = await db.runAsync(`DELETE FROM categories WHERE id = ?`, [req.params.id]);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json({ changes: result.changes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;