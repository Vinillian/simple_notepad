// ====================
// Управление категориями
// ====================

import { state } from './main.js';
import { createCategory as apiCreateCategory, deleteCategoryById } from './api.js';
import { filterNotesByCategory } from './notes.js';

export async function updateCategoriesUI(state) {
    const categoriesList = document.getElementById('categoriesList');
    const categoriesManager = document.getElementById('categoriesManager');
    categoriesList.innerHTML = '';
    categoriesManager.innerHTML = '';

    const notesByCategory = {};
    state.allNotes.forEach(note => {
        notesByCategory[note.category_id] = (notesByCategory[note.category_id] || 0) + 1;
    });
    const totalNotesCount = state.allNotes.length;

    state.categories.forEach(category => {
        let count = notesByCategory[category.id] || 0;
        if (category.id === 'all') count = totalNotesCount;

        const item = document.createElement('div');
        item.className = `category-item ${state.activeCategory === category.id ? 'active' : ''}`;
        item.innerHTML = `
            <div class="category-name">
                <span class="category-color" style="background-color: ${category.color}"></span>
                ${category.name}
            </div>
            <span class="category-count">${count}</span>
        `;
        item.addEventListener('click', () => setActiveCategory(category.id));
        categoriesList.appendChild(item);
    });

    // Менеджер категорий (модальное окно)
    state.categories.forEach(category => {
        const managerItem = document.createElement('div');
        managerItem.className = 'category-manager-item';
        let deleteButton = '';
        let categoryType = '';

        if (category.id === 'all') {
            categoryType = '<span style="font-size: 12px; color: #95a5a6; margin-left: 10px;">(системная)</span>';
            deleteButton = '<span style="color: #95a5a6; font-size: 12px;">не удаляемая</span>';
        } else {
            categoryType = '<span style="font-size: 12px; color: #666; margin-left: 10px;">(пользовательская)</span>';
            deleteButton = `<button class="delete-category-btn" data-id="${category.id}" title="Удалить категорию">🗑️</button>`;
        }

        managerItem.innerHTML = `
            <div style="display: flex; align-items: center;">
                <div class="category-manager-color" style="background-color: ${category.color}"></div>
                <span class="category-manager-name">${category.name}</span>
                ${categoryType}
            </div>
            <div class="category-manager-actions">
                ${deleteButton}
            </div>
        `;

        if (category.id !== 'all') {
            const delBtn = managerItem.querySelector('.delete-category-btn');
            delBtn.addEventListener('click', () => deleteCategory(category.id));
        }

        categoriesManager.appendChild(managerItem);
    });

    updateCategorySelects(state);
}

function updateCategorySelects(state) {
    const noteCategorySelect = document.getElementById('noteCategory');
    const categoryFilterSelect = document.getElementById('categoryFilter');

    noteCategorySelect.innerHTML = '<option value="">Выберите категорию</option>';
    categoryFilterSelect.innerHTML = '<option value="all">Все категории</option>';

    state.categories.forEach(category => {
        if (category.id !== 'all') {
            const option1 = document.createElement('option');
            option1.value = category.id;
            option1.textContent = category.name;
            option1.style.color = category.color;
            noteCategorySelect.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = category.id;
            option2.textContent = category.name;
            option2.style.color = category.color;
            categoryFilterSelect.appendChild(option2);
        }
    });

    const firstCategory = state.categories.find(c => c.id !== 'all');
    if (firstCategory) noteCategorySelect.value = firstCategory.id;
}

export async function setActiveCategory(categoryId) {
    state.activeCategory = categoryId;
    document.getElementById('activeCategory').textContent =
        categoryId === 'all' ? 'Все' : state.categories.find(c => c.id === categoryId)?.name || 'Все';
    document.getElementById('categoryFilter').value = categoryId;
    filterNotesByCategory(state);
    const { displayNotes } = await import('./ui.js');
    displayNotes(state);
    updateCategoriesUI(state);
}

export async function createCategory(name, color) {
    if (!name?.trim()) { alert('Введите название категории!'); return; }
    if (state.categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
        alert('Категория с таким названием уже существует!');
        return;
    }
    const newCategory = {
        id: 'cat_' + Date.now(),
        name: name.trim(),
        color: color,
        custom: true
    };
    try {
        await apiCreateCategory(newCategory);
        state.categories.push(newCategory);
        await updateCategoriesUI(state);
        document.getElementById('newCategoryName').value = '';
    } catch (error) {
        alert('Ошибка при создании категории');
    }
}

export async function deleteCategory(categoryId) {
    const category = state.categories.find(c => c.id === categoryId);
    if (!category || category.id === 'all') {
        alert('Эту категорию нельзя удалить!');
        return;
    }
    const notesInCategory = state.allNotes.filter(note => note.category_id === categoryId);
    if (notesInCategory.length > 0) {
        const action = prompt(
            `В категории "${category.name}" есть ${notesInCategory.length} заметок.\n\n` +
            '1 - Удалить категорию и все заметки\n2 - Переместить заметки в другую категорию\n3 - Отмена'
        );
        if (action === '1') {
            try {
                for (const note of notesInCategory) {
                    await deleteNoteById(note.id);
                }
                await deleteCategoryById(categoryId);
                state.categories = state.categories.filter(c => c.id !== categoryId);
                state.allNotes = state.allNotes.filter(n => n.category_id !== categoryId);
                if (state.activeCategory === categoryId) state.activeCategory = 'all';
                filterNotesByCategory(state);
                const { displayNotes } = await import('./ui.js');
                displayNotes(state);
                await updateCategoriesUI(state);
                alert(`Категория "${category.name}" и все заметки удалены.`);
            } catch (error) {
                alert('Ошибка при удалении');
            }
        } else if (action === '2') {
            showMoveNotesDialog(categoryId, category.name, notesInCategory.length);
        }
    } else {
        if (confirm(`Удалить категорию "${category.name}"?`)) {
            try {
                await deleteCategoryById(categoryId);
                state.categories = state.categories.filter(c => c.id !== categoryId);
                if (state.activeCategory === categoryId) state.activeCategory = 'all';
                filterNotesByCategory(state);
                const { displayNotes } = await import('./ui.js');
                displayNotes(state);
                await updateCategoriesUI(state);
            } catch (error) {
                alert('Ошибка при удалении');
            }
        }
    }
}

function showMoveNotesDialog(oldCategoryId, categoryName, notesCount) {
    // ... (реализация аналогична старой, но с использованием state)
}