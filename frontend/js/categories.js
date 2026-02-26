// ====================
// УПРАВЛЕНИЕ КАТЕГОРИЯМИ
// ====================

import { state } from './main.js';
import { createCategory as apiCreateCategory, deleteCategoryById, updateNote } from './api.js';

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

        const categoryItem = document.createElement('div');
        categoryItem.className = `category-item ${state.activeCategory === category.id ? 'active' : ''}`;
        categoryItem.innerHTML = `
            <div class="category-name">
                <span class="category-color" style="background-color: ${category.color}"></span>
                ${category.name}
            </div>
            <span class="category-count">${count}</span>
        `;
        categoryItem.addEventListener('click', () => setActiveCategory(category.id));
        categoriesList.appendChild(categoryItem);
    });

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