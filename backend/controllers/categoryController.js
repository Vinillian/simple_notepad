const db = require('../db');
const { NotFoundError, ValidationError } = require('../utils/errors');

// A deleted category stays in the table as a "tombstone" (deleted = 1) so that the
// deletion can reach the other devices. Tombstones older than this are removed.
const TOMBSTONE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

async function purgeTombstones() {
    await db.runAsync(
        `DELETE FROM categories WHERE deleted = 1 AND updated_timestamp < ?`,
        [Date.now() - TOMBSTONE_RETENTION_MS]
    );
}

// Reads an optional change time (milliseconds since the epoch) from a request.
function readTimestamp(value, fieldName) {
    if (value === undefined || value === null || value === '') return Date.now();
    const timestamp = Number(value);
    if (!Number.isFinite(timestamp)) {
        throw new ValidationError(`${fieldName} must be a number (milliseconds since the epoch)`);
    }
    return timestamp;
}

exports.getAllCategories = async (req, res, next) => {
    try {
        const { updated_after, include_deleted } = req.query;

        let after = null;
        if (updated_after !== undefined && updated_after !== '') {
            after = Number(updated_after);
            if (!Number.isFinite(after)) {
                throw new ValidationError('updated_after must be a number (milliseconds since the epoch)');
            }
        }
        // Tombstones are listed only on request, and always together with updated_after.
        const withDeleted = include_deleted === '1' || include_deleted === 'true' || after !== null;

        await purgeTombstones();

        const where = [];
        const params = [];
        if (!withDeleted) where.push(`deleted = 0`);
        if (after !== null) {
            where.push(`updated_timestamp > ?`);
            params.push(after);
        }

        let sql = `SELECT * FROM categories`;
        if (where.length) sql += ` WHERE ` + where.join(' AND ');

        const categories = await db.allAsync(sql, params);
        res.json(categories);
    } catch (err) {
        next(err);
    }
};

exports.createCategory = async (req, res, next) => {
    try {
        const { id, name, color, custom, updated_timestamp } = req.body;
        const updatedAt = readTimestamp(updated_timestamp, 'updated_timestamp');

        // A category with the same id that was deleted earlier is replaced by the new one.
        await db.runAsync(`DELETE FROM categories WHERE id = ? AND deleted = 1`, [id]);

        await db.runAsync(
            `INSERT INTO categories (id, name, color, custom, updated_timestamp) VALUES (?, ?, ?, ?, ?)`,
            [id, name, color, custom ? 1 : 0, updatedAt]
        );
        res.status(201).json({ id });
    } catch (err) {
        next(err);
    }
};

exports.updateCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, color, custom, updated_timestamp } = req.body;
        const updatedAt = readTimestamp(updated_timestamp, 'updated_timestamp');

        // An edit also brings a deleted category back (deleted = 0).
        const result = await db.runAsync(
            `UPDATE categories SET name = ?, color = ?, custom = ?, updated_timestamp = ?, deleted = 0 WHERE id = ?`,
            [name, color, custom ? 1 : 0, updatedAt, id]
        );
        if (result.changes === 0) throw new NotFoundError('Category');
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

exports.deleteCategory = async (req, res, next) => {
    try {
        const { id } = req.params;
        // Deleted notes (tombstones) do not count: only live notes block the deletion.
        const note = await db.getAsync(
            `SELECT id FROM notes WHERE category_id = ? AND deleted = 0 LIMIT 1`,
            [id]
        );
        if (note) {
            throw new ValidationError('Cannot delete category with existing notes');
        }
        // The row stays as a tombstone; its updated_timestamp is the time of the deletion.
        const result = await db.runAsync(
            `UPDATE categories SET deleted = 1, updated_timestamp = ? WHERE id = ? AND deleted = 0`,
            [Date.now(), id]
        );
        if (result.changes === 0) throw new NotFoundError('Category');
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};
