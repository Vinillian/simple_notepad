const db = require('../db');
const { NotFoundError, ValidationError } = require('../utils/errors');

// A deleted note stays in the table as a "tombstone" (deleted = 1) so that the
// deletion can reach the other devices. Tombstones older than this are removed.
const TOMBSTONE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

async function purgeTombstones() {
    await db.runAsync(
        `DELETE FROM notes WHERE deleted = 1 AND updated_timestamp < ?`,
        [Date.now() - TOMBSTONE_RETENTION_MS]
    );
}

exports.getAllNotes = async (req, res, next) => {
    try {
        const { category, sort, updated_after, include_deleted } = req.query;

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
        if (category && category !== 'all') {
            where.push(`category_id = ?`);
            params.push(category);
        }

        let sql = `SELECT * FROM notes`;
        if (where.length) sql += ` WHERE ` + where.join(' AND ');
        sql += ` ORDER BY created_timestamp ${sort === 'old' ? 'ASC' : 'DESC'}`;

        const notes = await db.allAsync(sql, params);
        notes.forEach(n => {
            if (n.metadata) n.metadata = JSON.parse(n.metadata);
        });
        res.json(notes);
    } catch (err) {
        next(err);
    }
};

exports.getNoteById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const note = await db.getAsync(`SELECT * FROM notes WHERE id = ? AND deleted = 0`, id);
        if (!note) throw new NotFoundError('Note');
        if (note.metadata) note.metadata = JSON.parse(note.metadata);
        res.json(note);
    } catch (err) {
        next(err);
    }
};

exports.createNote = async (req, res, next) => {
    try {
        const note = req.body;
        note.metadata = note.metadata ? JSON.stringify(note.metadata) : null;

        // A note with the same id that was deleted earlier is replaced by the new one.
        await db.runAsync(`DELETE FROM notes WHERE id = ? AND deleted = 1`, [note.id]);

        await db.runAsync(
            `INSERT INTO notes (id, title, content, category_id, date, created_timestamp, updated_timestamp, expanded, edit_mode, type, metadata) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                note.id,
                note.title,
                note.content,
                note.category_id,
                note.date,
                note.created_timestamp,
                note.updated_timestamp,
                note.expanded ? 1 : 0,
                note.edit_mode ? 1 : 0,
                note.type,
                note.metadata
            ]
        );
        res.status(201).json({ id: note.id });
    } catch (err) {
        next(err);
    }
};

exports.updateNote = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        updates.metadata = updates.metadata ? JSON.stringify(updates.metadata) : null;

        // An edit also brings a deleted note back (deleted = 0).
        const result = await db.runAsync(
            `UPDATE notes SET title = ?, content = ?, category_id = ?, date = ?, updated_timestamp = ?, expanded = ?, edit_mode = ?, type = ?, metadata = ?, deleted = 0 WHERE id = ?`,
            [
                updates.title,
                updates.content,
                updates.category_id,
                updates.date,
                updates.updated_timestamp,
                updates.expanded ? 1 : 0,
                updates.edit_mode ? 1 : 0,
                updates.type,
                updates.metadata,
                id
            ]
        );
        if (result.changes === 0) throw new NotFoundError('Note');
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

exports.deleteNote = async (req, res, next) => {
    try {
        const { id } = req.params;
        // The row stays as a tombstone; its updated_timestamp is the time of the deletion.
        const result = await db.runAsync(
            `UPDATE notes SET deleted = 1, updated_timestamp = ? WHERE id = ? AND deleted = 0`,
            [Date.now(), id]
        );
        if (result.changes === 0) throw new NotFoundError('Note');
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};