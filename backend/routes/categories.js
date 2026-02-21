const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { validateCategory } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Управление категориями
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Получить все категории
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Список категорий
 */
router.get('/', categoryController.getAllCategories);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Создать новую категорию
 *     tags: [Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - name
 *               - color
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               color:
 *                 type: string
 *               custom:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Категория создана
 */
router.post('/', validateCategory, categoryController.createCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Удалить категорию
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Удалено успешно
 *       400:
 *         description: Нельзя удалить категорию с заметками
 *       404:
 *         description: Категория не найдена
 */
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;