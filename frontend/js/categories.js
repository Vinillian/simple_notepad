// ====================
// УПРАВЛЕНИЕ КАТЕГОРИЯМИ
// ====================

import { state } from './main.js';
import { createCategory as apiCreateCategory, updateCategoryById, deleteCategoryById, updateNote } from './api.js';

export async function updateCategoriesUI(state) {
    const categoriesList = document.getElementById('categoriesList');
    categoriesList.innerHTML = '';

    const notesByCategory = {};
    state.allNotes.forEach(note => {
        notesByCategory[note.category_id] = (notesByCategory[note.category_id] || 0) + 1;
    });
    const totalNotesCount = state.allNotes.length;

    state.categories.forEach(category => {
        let count = notesByCategory[category.id] || 0;
        if (category.id === 'all') count = totalNotesCount;

        const categoryItem = document.createElement('div');
        categoryItem.className = `category-item ${state.activeCategory === category.id ? 'active' : ''}`;
        categoryItem.innerHTML = `
            <div class="category-name">
                <span class="category-color" style="background-color: ${category.color}"></span>
                ${escapeHtml(category.name)}
            </div>
            <span class="category-count">${count}</span>
        `;
        categoryItem.addEventListener('click', () => setActiveCategory(category.id));
        categoriesList.appendChild(categoryItem);
    });

    renderCategoriesManager(state);

    updateCategorySelects(state);
}

function updateCategorySelects(state) {
    const noteCategorySelect = document.getElementById('noteCategory');
    const categoryFilterSelect = document.getElementById('categoryFilter');

    const previousNoteCategory = noteCategorySelect.value;
    const previousFilter = categoryFilterSelect.value;
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

    // Keep what was chosen before the lists were rebuilt (for example after a
    // rename); otherwise fall back to the first category.
    const exists = (id) => id && id !== 'all' && state.categories.some(c => c.id === id);
    const firstCategory = state.categories.find(c => c.id !== 'all');
    if (exists(previousNoteCategory)) noteCategorySelect.value = previousNoteCategory;
    else if (firstCategory) noteCategorySelect.value = firstCategory.id;
    if (previousFilter === 'all' || exists(previousFilter)) categoryFilterSelect.value = previousFilter;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// <input type="color"> only accepts #rrggbb.
function toColorInputValue(color) {
    return /^#[0-9a-f]{6}$/i.test(color || '') ? color : '#888888';
}

export function openCategoryModal(mode) {
    const modal = document.getElementById('categoryModal');
    modal.dataset.mode = mode;
    document.getElementById('categoryModalTitle').textContent =
        mode === 'create' ? 'Новая категория' : 'Управление категориями';
    modal.classList.add('active');
    if (mode === 'create') document.getElementById('newCategoryName').focus();
}

export function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active');
}

// One row per category: colour, name (renamed on Enter or when the field
// loses focus) and a delete button. The system category "Все заметки" is not
// listed, it cannot be changed.
function renderCategoriesManager(state) {
    const manager = document.getElementById('categoriesManager');
    manager.innerHTML = '';

    const userCategories = state.categories.filter(c => c.id !== 'all');
    if (userCategories.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-message';
        empty.textContent = 'Категорий пока нет';
        manager.appendChild(empty);
        return;
    }

    userCategories.forEach(category => {
        const row = document.createElement('div');
        row.className = 'category-manager-item';

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.className = 'category-manager-color';
        colorInput.value = toColorInputValue(category.color);
        colorInput.title = 'Изменить цвет';
        colorInput.addEventListener('change', () => {
            saveCategoryChanges(category.id, { color: colorInput.value });
        });

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'category-manager-name';
        nameInput.value = category.name;
        nameInput.title = 'Переименовать (Enter или клик в другое место)';
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') nameInput.blur();
            if (e.key === 'Escape') {
                nameInput.value = category.name;
                nameInput.blur();
            }
        });
        nameInput.addEventListener('change', async () => {
            const saved = await saveCategoryChanges(category.id, { name: nameInput.value });
            if (!saved) nameInput.value = category.name;
        });

        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-category-btn';
        deleteButton.title = 'Удалить категорию';
        deleteButton.textContent = '🗑️';
        deleteButton.addEventListener('click', () => deleteCategory(category.id));

        row.append(colorInput, nameInput, deleteButton);
        manager.appendChild(row);
    });
}

// Renames and/or recolours a category on the server and in the page.
// Returns true when the category now has the requested values.
export async function saveCategoryChanges(categoryId, changes) {
    const category = state.categories.find(c => c.id === categoryId);
    if (!category) return false;

    const name = (changes.name !== undefined ? changes.name : category.name).trim();
    const color = changes.color !== undefined ? changes.color : category.color;

    if (!name) {
        alert('Введите название категории!');
        return false;
    }
    if (state.categories.some(c => c.id !== categoryId && c.name.toLowerCase() === name.toLowerCase())) {
        alert('Категория с таким названием уже существует!');
        return false;
    }
    if (name === category.name && color === category.color) return true;

    try {
        await updateCategoryById(categoryId, { name, color, custom: category.custom });
    } catch (error) {
        alert('Ошибка при сохранении категории');
        return false;
    }
    category.name = name;
    category.color = color;

    if (state.activeCategory === categoryId) {
        document.getElementById('activeCategory').textContent = name;
    }
    const { displayNotes } = await import('./ui.js');
    displayNotes(state);
    await updateCategoriesUI(state);
    return true;
}

export async function setActiveCategory(categoryId) {
    state.activeCategory = categoryId;
    document.getElementById('activeCategory').textContent =
        categoryId === 'all' ? 'Все' : state.categories.find(c => c.id === categoryId)?.name || 'Все';
    document.getElementById('categoryFilter').value = categoryId;

    const { filterNotesByCategory } = await import('./notes.js');
    filterNotesByCategory(state);
    
    const { displayNotes } = await import('./ui.js');
    displayNotes(state);
    
    await updateCategoriesUI(state);
}

export async function createCategory(name, color) {
    if (!name || name.trim() === '') {
        alert('Введите название категории!');
        return;
    }
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
        closeCategoryModal();
    } catch (error) {
        alert('Ошибка при создании категории');
    }
}

export async function deleteCategory(categoryId) {
    const category = state.categories.find(c => c.id === categoryId);
    if (!category) return;
    if (category.id === 'all') {
        alert('Категорию "Все заметки" нельзя удалить!');
        return;
    }
    
    const notesInCategory = state.allNotes.filter(note => note.category_id === categoryId);
    
    if (notesInCategory.length > 0) {
        const action = prompt(
            `В категории "${category.name}" есть ${notesInCategory.length} заметок.\n\n` +
            'Выберите действие:\n1 - Удалить категорию и все заметки в ней\n2 - Переместить заметки в другую категорию\n3 - Отмена'
        );
        
        if (action === '1') {
            try {
                for (const note of notesInCategory) {
                    await deleteNoteById(note.id);
                }
                await deleteCategoryById(categoryId);
                state.categories = state.categories.filter(cat => cat.id !== categoryId);
                state.allNotes = state.allNotes.filter(note => note.category_id !== categoryId);
                if (state.activeCategory === categoryId) {
                    state.activeCategory = 'all';
                }
                
                const { filterNotesByCategory } = await import('./notes.js');
                filterNotesByCategory(state);
                
                const { displayNotes } = await import('./ui.js');
                displayNotes(state);
                
                await updateCategoriesUI(state);
                alert(`Категория "${category.name}" и все заметки в ней удалены.`);
            } catch (error) {
                alert('Ошибка при удалении категории и заметок');
            }
        } else if (action === '2') {
            showMoveNotesDialog(categoryId, category.name, notesInCategory.length);
        }
    } else {
        if (confirm(`Удалить категорию "${category.name}"?`)) {
            try {
                await deleteCategoryById(categoryId);
                state.categories = state.categories.filter(cat => cat.id !== categoryId);
                if (state.activeCategory === categoryId) {
                    state.activeCategory = 'all';
                }
                
                const { filterNotesByCategory } = await import('./notes.js');
                filterNotesByCategory(state);
                
                const { displayNotes } = await import('./ui.js');
                displayNotes(state);
                
                await updateCategoriesUI(state);
                alert(`Категория "${category.name}" удалена.`);
            } catch (error) {
                alert('Ошибка при удалении категории');
            }
        }
    }
}

function showMoveNotesDialog(oldCategoryId, categoryName, notesCount) {
    const moveDialog = document.createElement('div');
    moveDialog.className = 'modal active';
    moveDialog.id = 'moveDialog';
    moveDialog.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Переместить заметки</h2>
                <button class="close-modal" onclick="document.getElementById('moveDialog').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <p>В категории "${categoryName}" находится ${notesCount} заметок.</p>
                <p>Выберите новую категорию для этих заметок:</p>
                <select id="targetCategorySelect" class="category-select" style="width: 100%; margin: 15px 0;">
                    <option value="">Выберите категорию</option>
                </select>
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button onclick="document.getElementById('moveDialog').remove()" class="cancel-edit-btn">Отмена</button>
                    <button onclick="moveNotesToCategory('${oldCategoryId}')" class="save-edit-btn">Переместить</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(moveDialog);
    
    const select = document.getElementById('targetCategorySelect');
    state.categories.forEach(cat => {
        if (cat.id !== oldCategoryId && cat.id !== 'all') {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            option.style.color = cat.color;
            select.appendChild(option);
        }
    });
}

window.moveNotesToCategory = async function(oldCategoryId) {
    const select = document.getElementById('targetCategorySelect');
    const newCategoryId = select.value;
    if (!newCategoryId) {
        alert('Выберите категорию для перемещения заметок!');
        return;
    }
    if (newCategoryId === 'all') {
        alert('Нельзя переместить заметки в категорию "Все заметки"!');
        return;
    }
    
    const newCategory = state.categories.find(c => c.id === newCategoryId);
    if (!newCategory) {
        alert('Выбранная категория не найдена!');
        return;
    }
    
    try {
        const notesToMove = state.allNotes.filter(note => note.category_id === oldCategoryId);
        for (const note of notesToMove) {
            note.category_id = newCategoryId;
            await updateNote(note.id, note);
        }
        
        await deleteCategoryById(oldCategoryId);
        state.categories = state.categories.filter(cat => cat.id !== oldCategoryId);
        state.allNotes.forEach(note => {
            if (note.category_id === oldCategoryId) note.category_id = newCategoryId;
        });
        
        if (state.activeCategory === oldCategoryId) {
            state.activeCategory = 'all';
        }
        
        document.getElementById('moveDialog')?.remove();
        document.getElementById('categoryModal').classList.remove('active');
        
        const { filterNotesByCategory } = await import('./notes.js');
        filterNotesByCategory(state);
        
        const { displayNotes } = await import('./ui.js');
        displayNotes(state);
        
        await updateCategoriesUI(state);
        alert(`Заметки перемещены в категорию "${newCategory.name}". Категория удалена.`);
    } catch (error) {
        alert('Ошибка при перемещении заметок');
    }
};