import { state } from './main.js';
import { setActiveCategory, updateCategoriesUI } from './categories.js';
import { addNote, deleteNote, editNote, cancelEditNote, saveEditedNote, toggleNoteExpansion } from './notes.js';
import { renderLinkContent } from './links.js';
import { renderMarkdown, containsMarkdown, createMarkdownToolbarHtml } from './markdown.js';
import { autoResizeTextarea, formatDate } from './utils.js';
import { updateSettings, deleteNoteById, deleteCategoryById } from './api.js';

// Отображение заметок
export function displayNotes(state) {
    const container = document.getElementById('notesContainer');
    if (state.notes.length === 0) {
        container.innerHTML = '<div class="empty-message">Заметок пока нет. Добавьте первую!</div>';
        return;
    }

    let html = '';

    state.notes.forEach(note => {
        const category = state.categories.find(c => c.id === note.category_id);
        const hasManyLines = note.content.split('\n').length > 10;
        const hasMarkdown = containsMarkdown(note.content);
        const isLink = note.type === 'link';
        const contentClass = `note-content ${isLink ? '' : 'markdown-content'} ${hasManyLines && !note.expanded ? 'collapsed' : ''}`;

        html += `
            <div class="note ${note.expanded ? 'expanded' : ''}" data-id="${note.id}" style="border-top-color: ${category?.color || '#4CAF50'}">
                <div class="note-header">
                    <div class="note-category" style="background-color: ${category?.color || '#4CAF50'}">
                        <span class="category-color" style="background-color: ${category?.color || '#4CAF50'}"></span>
                        ${category?.name || 'Без категории'}
                        ${hasMarkdown ? '<span class="markdown-badge" title="Содержит Markdown разметку"></span>' : ''}
                        ${isLink ? '<span style="margin-left: 5px;">🔗</span>' : ''}
                    </div>
                    <div class="note-actions">
                        <button class="note-action-btn edit-btn" onclick="window.editNote(${note.id})" title="Редактировать">✏️</button>
                        <button class="note-action-btn delete-btn" onclick="window.deleteNote(${note.id})" title="Удалить">🗑️</button>
                        ${hasManyLines ? `
                            <button class="note-action-btn expand-btn" onclick="window.toggleNoteExpansion(${note.id})" title="${note.expanded ? 'Свернуть' : 'Развернуть'}">
                                ${note.expanded ? '⬆️' : '⬇️'}
                            </button>
                        ` : ''}
                    </div>
                </div>

                <div class="note-title">${note.title}</div>

                ${note.edit_mode ? `
                    <div class="note-edit active">
                        ${hasMarkdown ? createMarkdownToolbarHtml() : ''}
                        <input type="text" class="edit-title" value="${note.title.replace(/"/g, '&quot;')}" placeholder="Заголовок">
                        <textarea class="edit-textarea ${hasMarkdown ? 'markdown-editor' : ''}" data-id="${note.id}" data-has-markdown="${hasMarkdown}">${note.content}</textarea>
                        <div class="edit-actions">
                            ${hasMarkdown ? '<button type="button" class="markdown-preview-btn" onclick="window.toggleMarkdownPreview(this, ' + note.id + ')">Предпросмотр</button>' : ''}
                            <button class="cancel-edit-btn" onclick="window.cancelEditNote(${note.id})">Отмена</button>
                            <button class="save-edit-btn" onclick="window.saveEditedNote(${note.id}, this.parentElement.parentElement.querySelector('.edit-title').value, this.parentElement.parentElement.querySelector('.edit-textarea').value)">Сохранить</button>
                        </div>
                    </div>
                ` : `
                    <div class="${contentClass}">
                        ${isLink ? renderLinkContent(note) : renderMarkdown(note.content)}
                    </div>
                    ${hasManyLines && !note.expanded ? `
                        <button class="expand-btn" onclick="window.toggleNoteExpansion(${note.id})" style="background: none; border: none; color: #3498db; cursor: pointer; padding: 5px 0; text-align: left;">
                            Показать полностью...
                        </button>
                    ` : ''}
                `}

                <div class="note-footer">
                    <div class="note-date">${note.date || formatDate(note.updated_timestamp || note.created_timestamp)}</div>
                    ${hasManyLines && note.expanded ? `
                        <button onclick="window.toggleNoteExpansion(${note.id})" style="background: none; border: none; color: #95a5a6; cursor: pointer; font-size: 12px;">
                            Свернуть
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Обновление статистики
export function updateStats(state) {
    document.getElementById('totalNotes').textContent = state.allNotes.length;
    document.getElementById('totalCategories').textContent = state.categories.filter(c => c.custom).length;
    document.getElementById('currentGroupTitle').textContent =
        state.activeCategory === 'all' ? 'Все заметки' : (state.categories.find(c => c.id === state.activeCategory)?.name || 'Все заметки');
    document.getElementById('activeCategory').textContent =
        state.activeCategory === 'all' ? 'Все' : (state.categories.find(c => c.id === state.activeCategory)?.name || 'Все');
    document.getElementById('sortOrder').textContent = state.sortOrder === 'new' ? 'новые' : 'старые';
}

// Авторазмер textarea
export function setupAutoResize() {
    const textarea = document.getElementById('noteInput');
    textarea.addEventListener('input', function () {
        autoResizeTextarea(this);
        document.getElementById('charCount').textContent = this.value.length;
    });
    autoResizeTextarea(textarea);
}

// Установка режима отображения
export function setupViewMode(state) {
    // Убираем активный класс у всех кнопок
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    const container = document.getElementById('notesContainer');
    
    if (state.viewMode === 'list') {
        document.getElementById('viewListBtn').classList.add('active');
        container.className = 'notes-container list-view';
    } else {
        document.getElementById('viewPreviewBtn').classList.add('active');
        container.className = 'notes-container preview-view';
    }
}

export function setupSortOrder(state) {
    document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
    if (state.sortOrder === 'new') {
        document.getElementById('sortNewBtn').classList.add('active');
    } else {
        document.getElementById('sortOldBtn').classList.add('active');
    }
}

// Экспорт в JSON
function exportToJSON() {
    if (state.allNotes.length === 0 && state.categories.filter(c => c.custom).length === 0) {
        alert('Нет данных для экспорта');
        return;
    }
    const exportData = {
        notes: state.allNotes,
        categories: state.categories.filter(c => c.custom),
        settings: { sortOrder: state.sortOrder, viewMode: state.viewMode },
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `notebook_export_${new Date().toISOString().slice(0, 10)}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// Импорт из JSON (заглушка)
function importFromJSON(event) {
    alert('Импорт из JSON пока не поддерживается в серверной версии. Используйте скрипт миграции.');
    event.target.value = '';
}

// Очистка всех данных
async function clearAllData() {
    if (state.allNotes.length === 0 && state.categories.filter(c => c.custom).length === 0) {
        alert('Нет данных для очистки');
        return;
    }
    if (confirm('Удалить ВСЕ заметки и пользовательские категории? Это действие нельзя отменить.')) {
        try {
            for (const note of state.allNotes) {
                await deleteNoteById(note.id);
            }
            for (const cat of state.categories.filter(c => c.custom)) {
                await deleteCategoryById(cat.id);
            }
            
            state.allNotes = [];
            state.categories = [
                { id: 'all', name: 'Все заметки', color: '#7f8c8d', custom: false },
                { id: 'thinking', name: 'Размышления', color: '#4CAF50', custom: true },
                { id: 'tasks', name: 'Задачи', color: '#2196F3', custom: true },
                { id: 'ideas', name: 'Идеи', color: '#FF9800', custom: true }
            ];
            state.activeCategory = 'all';
            state.editingNoteId = null;

            const { filterNotesByCategory } = await import('./notes.js');
            filterNotesByCategory(state);
            displayNotes(state);
            await updateCategoriesUI(state);
            alert('Все данные очищены');
        } catch (error) {
            alert('Ошибка при очистке данных');
        }
    }
}

// Настройка обработчиков событий (исправлено: убраны await, добавлены .catch)
export function setupEventListeners(state) {
    document.getElementById('saveBtn').addEventListener('click', () => {
        const title = document.getElementById('noteTitle').value;
        const text = document.getElementById('noteInput').value;
        const categoryId = document.getElementById('noteCategory').value;
        addNote(title, text, categoryId);
    });

    document.getElementById('noteInput').addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const title = document.getElementById('noteTitle').value;
            const categoryId = document.getElementById('noteCategory').value;
            addNote(title, this.value, categoryId);
        }
    });

    document.getElementById('addCategoryBtn').addEventListener('click', () => {
        document.getElementById('categoryModal').classList.add('active');
    });

    document.getElementById('createCategoryBtn').addEventListener('click', () => {
        const name = document.getElementById('newCategoryName').value;
        const color = document.getElementById('newCategoryColor').value;
        import('./categories.js').then(module => module.createCategory(name, color));
    });

    document.getElementById('editCategoriesBtn').addEventListener('click', () => {
        document.getElementById('categoryModal').classList.add('active');
    });

    document.querySelector('.close-modal').addEventListener('click', () => {
        document.getElementById('categoryModal').classList.remove('active');
    });

    document.getElementById('categoryModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('categoryModal')) {
            document.getElementById('categoryModal').classList.remove('active');
        }
    });

    document.getElementById('categoryFilter').addEventListener('change', function () {
        setActiveCategory(this.value);
    });

    document.getElementById('clearFilterBtn').addEventListener('click', () => {
        setActiveCategory('all');
    });

    // Сортировка: убрали await, вызываем loadAllNotes независимо
    document.getElementById('sortNewBtn').addEventListener('click', () => {
        state.sortOrder = 'new';
        updateSettings({ sort_order: state.sortOrder, view_mode: state.viewMode }).catch(console.error);
        import('./main.js').then(module => module.loadAllNotes());
    });

    document.getElementById('sortOldBtn').addEventListener('click', () => {
        state.sortOrder = 'old';
        updateSettings({ sort_order: state.sortOrder, view_mode: state.viewMode }).catch(console.error);
        import('./main.js').then(module => module.loadAllNotes());
    });

    // Переключение режимов: убрали await, переключение происходит мгновенно
    document.getElementById('viewListBtn').addEventListener('click', () => {
        state.viewMode = 'list';
        updateSettings({ sort_order: state.sortOrder, view_mode: state.viewMode }).catch(console.error);
        setupViewMode(state);
        displayNotes(state);
    });

    document.getElementById('viewPreviewBtn').addEventListener('click', () => {
        state.viewMode = 'preview';
        updateSettings({ sort_order: state.sortOrder, view_mode: state.viewMode }).catch(console.error);
        setupViewMode(state);
        displayNotes(state);
    });

    document.getElementById('exportBtn').addEventListener('click', exportToJSON);
    
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });
    
    document.getElementById('importFile').addEventListener('change', importFromJSON);
    document.getElementById('clearAllBtn').addEventListener('click', clearAllData);
}

// Делаем функции глобальными для onclick обработчиков
window.editNote = editNote;
window.deleteNote = deleteNote;
window.toggleNoteExpansion = toggleNoteExpansion;
window.cancelEditNote = cancelEditNote;
window.saveEditedNote = saveEditedNote;
window.toggleMarkdownPreview = (button, noteId) => {
    import('./markdown.js').then(module => module.toggleMarkdownPreview(button, noteId));
};