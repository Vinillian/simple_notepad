const db = require('../db');
const { NotFoundError } = require('../utils/errors');

exports.getAllNotes = async (req, res, next) => {
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
        const note = await db.getAsync(`SELECT * FROM notes WHERE id = ?`, id);
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

        const result = await db.runAsync(
            `UPDATE notes SET title = ?, content = ?, category_id = ?, date = ?, updated_timestamp = ?, expanded = ?, edit_mode = ?, type = ?, metadata = ? WHERE id = ?`,
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
        const result = await db.runAsync(`DELETE FROM notes WHERE id = ?`, id);
        if (result.changes === 0) throw new NotFoundError('Note');
        res.status(204).send();
    } catch (err) {
        next(err);
    }
};