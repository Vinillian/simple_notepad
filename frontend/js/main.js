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

const LOCAL_STORAGE_KEY = 'simple_notepad_offline';

import { fetchSettings, fetchCategories, fetchNotes } from './api.js';
import { updateCategoriesUI } from './categories.js';
import { filterNotesByCategory } from './notes.js';
import { displayNotes, setupEventListeners, setupAutoResize, setupViewMode, setupSortOrder, updateStats } from './ui.js';

// Функции для работы с локальным хранилищем
export function saveToLocalStorage() {
    try {
        const data = {
            allNotes: state.allNotes,
            categories: state.categories,
            settings: { sortOrder: state.sortOrder, viewMode: state.viewMode }
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error('Ошибка сохранения в localStorage', e);
    }
}

export function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            state.allNotes = data.allNotes || [];
            state.categories = data.categories || [];
            // добавляем виртуальную категорию "Все заметки", если её нет
            if (!state.categories.some(c => c.id === 'all')) {
                state.categories.unshift({ id: 'all', name: 'Все заметки', color: '#7f8c8d', custom: false });
            }
            state.sortOrder = data.settings?.sortOrder || 'new';
            state.viewMode = data.settings?.viewMode || 'list';
            return true;
        }
    } catch (e) {
        console.error('Ошибка загрузки из localStorage', e);
    }
    return false;
}

export async function initApp() {
    console.log('Инициализация приложения...');
    try {
        // Пытаемся загрузить с сервера
        let settings = null;
        let categoriesFromServer = null;
        let notesFromServer = null;

        try {
            settings = await fetchSettings();
            categoriesFromServer = await fetchCategories();
            notesFromServer = await fetchNotes(state.sortOrder);
        } catch (e) {
            console.warn('Сервер недоступен, загружаем локальные данные', e);
        }

        if (settings) {
            // Сервер доступен – используем его данные
            state.sortOrder = settings.sort_order || 'new';
            state.viewMode = settings.view_mode || 'list';
            state.categories = categoriesFromServer || [];
            state.allNotes = notesFromServer || [];
            // добавляем виртуальную категорию, если её нет
            if (!state.categories.some(c => c.id === 'all')) {
                state.categories.unshift({ id: 'all', name: 'Все заметки', color: '#7f8c8d', custom: false });
            }
            // обновляем локальную копию
            saveToLocalStorage();
        } else {
            // Сервер недоступен – загружаем из localStorage
            const loaded = loadFromLocalStorage();
            if (!loaded) {
                // Если локально пусто, используем минимальные данные по умолчанию
                console.log('Локальные данные отсутствуют');
                state.allNotes = [];
                state.categories = [
                    { id: 'all', name: 'Все заметки', color: '#7f8c8d', custom: false }
                ];
            } else {
                console.log('Загружено из локального хранилища');
            }
        }

        // Убедимся, что у всех заметок есть поле expanded
        state.allNotes.forEach(note => {
            if (note.expanded === undefined) note.expanded = false;
        });

        // Обновляем интерфейс
        await updateCategoriesUI(state);
        filterNotesByCategory(state);
        displayNotes(state);
        setupEventListeners(state);
        setupAutoResize();
        setupViewMode(state);
        setupSortOrder(state);
        updateStats(state);

        console.log('Приложение готово!');
    } catch (error) {
        console.error('Критическая ошибка инициализации:', error);
        alert('Не удалось загрузить данные. Проверьте соединение или очистите локальное хранилище.');
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
    saveToLocalStorage(); // сохраняем после загрузки
}

document.addEventListener('DOMContentLoaded', initApp);