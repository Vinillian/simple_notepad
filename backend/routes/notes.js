const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');
const { validateNote } = require('../middleware/validation');

router.get('/', noteController.getAllNotes);
router.get('/:id', noteController.getNoteById);
router.post('/', validateNote, noteController.createNote);
router.put('/:id', validateNote, noteController.updateNote);
router.delete('/:id', noteController.deleteNote);

module.exports = router;