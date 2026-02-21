const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const { validateSettings } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: Настройки приложения
 */

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Получить настройки
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Текущие настройки
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sort_order:
 *                   type: string
 *                   enum: [new, old]
 *                 view_mode:
 *                   type: string
 *                   enum: [list, grid]
 */
router.get('/', settingController.getSettings);

/**
 * @swagger
 * /api/settings:
 *   put:
 *     summary: Обновить настройки
 *     tags: [Settings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sort_order:
 *                 type: string
 *                 enum: [new, old]
 *               view_mode:
 *                 type: string
 *                 enum: [list, grid]
 *     responses:
 *       200:
 *         description: Настройки обновлены
 */
router.put('/', validateSettings, settingController.updateSettings);

module.exports = router;