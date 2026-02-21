const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const { validateSettings } = require('../middleware/validation');

router.get('/', settingController.getSettings);
router.put('/', validateSettings, settingController.updateSettings);

module.exports = router;