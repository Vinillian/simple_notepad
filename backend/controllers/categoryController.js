const db = require('../db');
const { NotFoundError, ValidationError } = require('../utils/errors');

exports.getAllCategories = async (req, res, next) => {
    try {
        const categories = await db.allAsync(`SELECT * FROM categories`);
        res.json(categories);
    } catch (err) {
        next(err);
    }
};

exports.createCategory = async (req, res, next) => {
    try {
        const { id, name, color, custom } = req.body;
        await db.runAsync(
            `INSERT INTO categories (id, name, color, custom) VALUES (?, ?, ?, ?)`,
            [id, name, color, custom ? 1 : 0]
        );
        res.status(201).json({ id });
    } catch (err) {
        next(err);
    }
};

exports.deleteCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const notes = await db.allAsync(`SELECT id FROM notes WHERE category_id = ?`, id);
        if (notes.length > 0) {
            throw new ValidationError('Cannot delete category with existing notes');
        }
        const result = await db.runAsync(`DELETE FROM categories WHERE id = ?`, id);
        if (result.changes === 0) throw new NotFoundError('Category');
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};