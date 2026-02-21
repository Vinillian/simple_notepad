const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');
const { validateNote } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Notes
 *   description: Управление заметками
 */

/**
 * @swagger
 * /api/notes:
 *   get:
 *     summary: Получить все заметки
 *     tags: [Notes]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: ID категории для фильтрации
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [new, old]
 *         description: 'Сортировка: new - сначала новые, old - сначала старые'
 *     responses:
 *       200:
 *         description: Список заметок
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get('/', noteController.getAllNotes);

/**
 * @swagger
 * /api/notes/{id}:
 *   get:
 *     summary: Получить заметку по ID
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         description: ID заметки
 *     responses:
 *       200:
 *         description: Данные заметки
 *       404:
 *         description: Заметка не найдена
 */
router.get('/:id', noteController.getNoteById);

/**
 * @swagger
 * /api/notes:
 *   post:
 *     summary: Создать новую заметку
 *     tags: [Notes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - content
 *               - category_id
 *             properties:
 *               id:
 *                 type: number
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               category_id:
 *                 type: string
 *               date:
 *                 type: string
 *               created_timestamp:
 *                 type: number
 *               updated_timestamp:
 *                 type: number
 *               type:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Заметка создана
 */
router.post('/', validateNote, noteController.createNote);

/**
 * @swagger
 * /api/notes/{id}:
 *   put:
 *     summary: Обновить заметку
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               category_id:
 *                 type: string
 *               date:
 *                 type: string
 *               updated_timestamp:
 *                 type: number
 *               type:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Обновлено успешно
 *       404:
 *         description: Заметка не найдена
 */
router.put('/:id', validateNote, noteController.updateNote);

/**
 * @swagger
 * /api/notes/{id}:
 *   delete:
 *     summary: Удалить заметку
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       204:
 *         description: Удалено успешно
 *       404:
 *         description: Заметка не найдена
 */
router.delete('/:id', noteController.deleteNote);

module.exports = router;