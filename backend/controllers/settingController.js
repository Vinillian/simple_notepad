const db = require('../db');

exports.getSettings = async (req, res, next) => {
    try {
        const settings = await db.getAsync(`SELECT sort_order, view_mode FROM settings WHERE id = 1`);
        res.json(settings || { sort_order: 'new', view_mode: 'list' });
    } catch (err) {
        next(err);
    }
};

exports.updateSettings = async (req, res, next) => {
    try {
        const { sort_order, view_mode } = req.body;
        await db.runAsync(
            `UPDATE settings SET sort_order = ?, view_mode = ? WHERE id = 1`,
            [sort_order, view_mode]
        );
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};