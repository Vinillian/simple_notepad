const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/settings – получение настроек (одна строка)
router.get('/', async (req, res) => {
    try {
        const settings = await db.getAsync(`SELECT sort_order, view_mode FROM settings WHERE id = 1`);
        res.json(settings || { sort_order: 'new', view_mode: 'list' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/settings – обновление настроек
router.put('/', async (req, res) => {
    try {
        const { sort_order, view_mode } = req.body;
        await db.runAsync(
            `UPDATE settings SET sort_order = ?, view_mode = ? WHERE id = 1`,
            [sort_order, view_mode]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;