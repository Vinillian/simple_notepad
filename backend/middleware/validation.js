const { ValidationError } = require('../utils/errors');

const validateNote = (req, res, next) => {
    const { title, content, category_id } = req.body;
    if (!content || content.trim() === '') {
        return next(new ValidationError('Content is required'));
    }
    if (!category_id) {
        return next(new ValidationError('Category ID is required'));
    }
    next();
};

const validateCategory = (req, res, next) => {
    const { name, color } = req.body;
    if (!name || name.trim() === '') {
        return next(new ValidationError('Category name is required'));
    }
    if (!color) {
        return next(new ValidationError('Category color is required'));
    }
    next();
};

const validateSettings = (req, res, next) => {
    const { sort_order, view_mode } = req.body;
    if (sort_order && !['new', 'old'].includes(sort_order)) {
        return next(new ValidationError('sort_order must be "new" or "old"'));
    }
    if (view_mode && !['list', 'grid'].includes(view_mode)) {
        return next(new ValidationError('view_mode must be "list" or "grid"'));
    }
    next();
};

module.exports = {
    validateNote,
    validateCategory,
    validateSettings
};