// ====================
// Главный модуль – точка входа
// ====================

export const state = {
    notes: [],
    allNotes: [],
    categories: [],
    activeCategory: 'all',
    editingNoteId: null,
    sortOrder: 'new',
    viewMode: 'list',
    linkPreviewCache: new Map(),
    fetchQueue: new Map(),
    isFetching: false
};

import { fetchSettings, fetchCategories, fetchNotes, deleteNoteById, deleteCategoryById } from './api.js';
import { updateCategoriesUI, setActiveCategory } from './categories.js';
import { filterNotesByCategory } from './notes.js';
import { displayNotes, setupEventListeners, setupAutoResize, setupViewMode, setupSortOrder, updateStats } from './ui.js';

export async function initApp() {
    console.log('Инициализация приложения...');
    try {
        const settings = await fetchSettings();
        state.sortOrder = settings.sort_order || 'new';
        state.viewMode = settings.view_mode || 'list';

        state.categories = await fetchCategories();
        updateCategoriesUI(state);

        await loadAllNotes();

        setupEventListeners(state);
        setupAutoResize();
        setupViewMode(state);
        setupSortOrder(state);
        updateStats(state);
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        alert('Не удалось загрузить данные. Проверьте, запущен ли сервер (backend).');
    }
}

export async function loadAllNotes() {
    state.allNotes = await fetchNotes(state.sortOrder);
    filterNotesByCategory(state);
    updateCategoriesUI(state);
    displayNotes(state);
}

// Запуск
document.addEventListener('DOMContentLoaded', initApp);