// ====================
// ГЛАВНЫЙ МОДУЛЬ - СОСТОЯНИЕ ПРИЛОЖЕНИЯ
// ====================

export const state = {
    notes: [],           // отфильтрованные заметки для отображения
    allNotes: [],        // полный список всех заметок
    categories: [],
    activeCategory: 'all',
    editingNoteId: null,
    sortOrder: 'new',
    viewMode: 'list',     // 'list' или 'preview'
    linkPreviewCache: new Map(),
    fetchQueue: new Map(),
    isFetching: false
};

import { fetchSettings, fetchCategories, fetchNotes } from './api.js';
import { updateCategoriesUI } from './categories.js';
import { filterNotesByCategory } from './notes.js';
import { displayNotes, setupEventListeners, setupAutoResize, setupViewMode, setupSortOrder, updateStats } from './ui.js';

export async function initApp() {
    console.log('Инициализация приложения...');
    try {
        const settings = await fetchSettings();
        state.sortOrder = settings.sort_order || 'new';
        state.viewMode = settings.view_mode || 'list';

        state.categories = await fetchCategories();
        await updateCategoriesUI(state);

        await loadAllNotes();

        setupEventListeners(state);
        setupAutoResize();
        setupViewMode(state);
        setupSortOrder(state);
        updateStats(state);

        console.log('Приложение готово!');
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        alert('Не удалось загрузить данные. Проверьте, запущен ли сервер (backend).');
    }
}

export async function loadAllNotes() {
    state.allNotes = await fetchNotes(state.sortOrder);
    
    state.allNotes.forEach(note => {
        if (note.expanded === undefined) note.expanded = false;
    });
    
    filterNotesByCategory(state);
    await updateCategoriesUI(state);
    displayNotes(state);
}

document.addEventListener('DOMContentLoaded', initApp);