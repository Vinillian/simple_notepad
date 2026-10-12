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
 *     parameters:
 *       - in: query
 *         name: updated_after
 *         schema:
 *           type: number
 *         description: 'Only categories changed after this time (milliseconds since the epoch). Deleted categories (tombstones, deleted = 1) are included, so that other devices can apply the deletions.'
 *       - in: query
 *         name: include_deleted
 *         schema:
 *           type: string
 *           enum: ['1', 'true']
 *         description: 'Also list deleted categories (tombstones). By default only live categories are returned.'
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
 *               updated_timestamp:
 *                 type: number
 *                 description: 'Change time in milliseconds since the epoch (default: now)'
 *     responses:
 *       201:
 *         description: Категория создана (категория с тем же id, удалённая ранее, заменяется новой)
 */
router.post('/', validateCategory, categoryController.createCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Обновить категорию (также возвращает удалённую категорию)
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - color
 *             properties:
 *               name:
 *                 type: string
 *               color:
 *                 type: string
 *               custom:
 *                 type: boolean
 *               updated_timestamp:
 *                 type: number
 *                 description: 'Change time in milliseconds since the epoch (default: now)'
 *     responses:
 *       200:
 *         description: Категория обновлена
 *       404:
 *         description: Категория не найдена
 */
router.put('/:id', validateCategory, categoryController.updateCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Удалить категорию (остаётся как «надгробие» с deleted = 1 на 30 дней)
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
 *         description: Нельзя удалить категорию с заметками (удалённые заметки не считаются)
 *       404:
 *         description: Категория не найдена
 */
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;