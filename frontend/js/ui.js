// ====================
// Рендеринг интерфейса и обработчики событий
// ====================

import { state } from './main.js';
import { setActiveCategory, createCategory, updateCategoriesUI } from './categories.js';
import { addNote, deleteNote, editNote, cancelEditNote, saveEditedNote, toggleNoteExpansion, filterNotesByCategory } from './notes.js';
import { renderLinkContent } from './links.js';
import { renderMarkdown, containsMarkdown, createMarkdownToolbarHtml, insertMarkdown, showMarkdownHelp, toggleMarkdownPreview } from './markdown.js';
import { autoResizeTextarea, formatDate } from './utils.js';
import { updateSettings } from './api.js';

export function displayNotes(state) {
    const container = document.getElementById('notesContainer');
    if (state.notes.length === 0) {
        container.innerHTML = '<div class="empty-message">Заметок пока нет. Добавьте первую!</div>';
        return;
    }

    container.innerHTML = '';

    state.notes.forEach(note => {
        const noteEl = document.createElement('div');
        noteEl.className = `note ${note.expanded ? 'expanded' : ''}`;
        noteEl.dataset.id = note.id;

        const category = state.categories.find(c => c.id === note.category_id);
        const categoryColor = category?.color || '#4CAF50';
        const categoryName = category?.name || 'Без категории';
        const hasMarkdown = containsMarkdown(note.content);
        const isLink = note.type === 'link';
        const lines = note.content.split('\n').length;
        const isExpanded = note.expanded || lines <= 10;
        const hasManyLines = lines > 10;

        // Шапка
        const header = document.createElement('div');
        header.className = 'note-header';

        const catDiv = document.createElement('div');
        catDiv.className = 'note-category';
        catDiv.style.backgroundColor = categoryColor;
        catDiv.innerHTML = `
            <span class="category-color" style="background-color: ${categoryColor}"></span>
            ${categoryName}
            ${hasMarkdown ? '<span class="markdown-badge" title="Содержит Markdown разметку"></span>' : ''}
            ${isLink ? '<span style="margin-left: 5px;">🔗</span>' : ''}
        `;

        const actions = document.createElement('div');
        actions.className = 'note-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'note-action-btn edit-btn';
        editBtn.title = 'Редактировать';
        editBtn.innerHTML = '✏️';
        editBtn.addEventListener('click', (e) => { e.stopPropagation(); editNote(note.id); });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'note-action-btn delete-btn';
        deleteBtn.title = 'Удалить';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteNote(note.id); });

        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        if (isExpanded && hasManyLines) {
            const collapseBtn = document.createElement('button');
            collapseBtn.className = 'note-action-btn collapse-top-btn';
            collapseBtn.title = 'Свернуть';
            collapseBtn.innerHTML = '⬆️';
            collapseBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleNoteExpansion(note.id); });
            actions.appendChild(collapseBtn);
        } else if (!isExpanded) {
            const expandBtn = document.createElement('button');
            expandBtn.className = 'note-action-btn expand-btn';
            expandBtn.title = 'Развернуть';
            expandBtn.innerHTML = '⬇️';
            expandBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleNoteExpansion(note.id); });
            actions.appendChild(expandBtn);
        }

        header.appendChild(catDiv);
        header.appendChild(actions);

        // Заголовок
        const titleDiv = document.createElement('div');
        titleDiv.className = 'note-title';
        titleDiv.textContent = note.title;

        // Контент
        let contentDiv;
        if (note.edit_mode) {
            contentDiv = document.createElement('div');
            contentDiv.className = 'note-edit active';
            if (hasMarkdown) {
                const toolbar = document.createElement('div');
                toolbar.innerHTML = createMarkdownToolbarHtml();
                toolbar.querySelectorAll('.markdown-tool').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        const textarea = contentDiv.querySelector('.edit-textarea');
                        const type = btn.dataset.md;
                        if (type === 'Help') showMarkdownHelp();
                        else insertMarkdown(textarea, type);
                    });
                });
                contentDiv.appendChild(toolbar);
            }
            const editTitle = document.createElement('input');
            editTitle.type = 'text';
            editTitle.className = 'edit-title';
            editTitle.value = note.title;

            const editTextarea = document.createElement('textarea');
            editTextarea.className = `edit-textarea ${hasMarkdown ? 'markdown-editor' : ''}`;
            editTextarea.value = note.content;
            editTextarea.addEventListener('input', () => autoResizeTextarea(editTextarea));
            setTimeout(() => autoResizeTextarea(editTextarea), 0);

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'edit-actions';

            if (hasMarkdown) {
                const previewBtn = document.createElement('button');
                previewBtn.type = 'button';
                previewBtn.className = 'markdown-preview-btn';
                previewBtn.textContent = 'Предпросмотр';
                previewBtn.addEventListener('click', () => toggleMarkdownPreview(previewBtn, editTextarea));
                actionsDiv.appendChild(previewBtn);
            }

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'cancel-edit-btn';
            cancelBtn.textContent = 'Отмена';
            cancelBtn.addEventListener('click', () => cancelEditNote(note.id));

            const saveBtn = document.createElement('button');
            saveBtn.className = 'save-edit-btn';
            saveBtn.textContent = 'Сохранить';
            saveBtn.addEventListener('click', () => {
                saveEditedNote(note.id, editTitle.value, editTextarea.value);
            });

            actionsDiv.appendChild(cancelBtn);
            actionsDiv.appendChild(saveBtn);

            contentDiv.appendChild(editTitle);
            contentDiv.appendChild(editTextarea);
            contentDiv.appendChild(actionsDiv);
        } else {
            contentDiv = document.createElement('div');
            contentDiv.className = `note-content ${isLink ? '' : 'markdown-content'} ${isExpanded ? '' : 'collapsed'}`;
            if (isLink) {
                contentDiv.innerHTML = renderLinkContent(note);
            } else {
                contentDiv.innerHTML = renderMarkdown(note.content);
            }
        }

        // Футер
        const footer = document.createElement('div');
        footer.className = 'note-footer';
        const dateSpan = document.createElement('span');
        dateSpan.className = 'note-date';
        dateSpan.textContent = note.date || formatDate(note.updated || note.created);
        footer.appendChild(dateSpan);

        if (isExpanded && hasManyLines && !isLink) {
            const collapseFooterBtn = document.createElement('button');
            collapseFooterBtn.textContent = 'Свернуть';
            collapseFooterBtn.style.cssText = 'background: none; border: none; color: #95a5a6; cursor: pointer; font-size: 12px;';
            collapseFooterBtn.addEventListener('click', () => toggleNoteExpansion(note.id));
            footer.appendChild(collapseFooterBtn);
        }

        noteEl.appendChild(header);
        noteEl.appendChild(titleDiv);
        noteEl.appendChild(contentDiv);
        noteEl.appendChild(footer);

        container.appendChild(noteEl);
    });
}

export function updateStats(state) {
    document.getElementById('totalNotes').textContent = state.allNotes.length;
    document.getElementById('totalCategories').textContent = state.categories.filter(c => c.custom).length;
}

export function setupAutoResize() {
    const textarea = document.getElementById('noteInput');
    textarea.addEventListener('input', function () {
        autoResizeTextarea(this);
        document.getElementById('charCount').textContent = this.value.length;
    });
    autoResizeTextarea(textarea);
}

export function setupViewMode(state) {
    document.getElementById('viewListBtn').classList.toggle('active', state.viewMode === 'list');
    document.getElementById('viewGridBtn').classList.toggle('active', state.viewMode === 'grid');
    document.getElementById('notesContainer').className = `notes-container ${state.viewMode}-view`;
}

export function setupSortOrder(state) {
    document.getElementById('sortNewBtn').classList.toggle('active', state.sortOrder === 'new');
    document.getElementById('sortOldBtn').classList.toggle('active', state.sortOrder === 'old');
    document.getElementById('sortOrder').textContent = state.sortOrder === 'new' ? 'новые' : 'старые';
}

export function setupEventListeners(state) {
    // Сохранение заметки
    document.getElementById('saveBtn').addEventListener('click', () => {
        const title = document.getElementById('noteTitle').value;
        const text = document.getElementById('noteInput').value;
        const categoryId = document.getElementById('noteCategory').value;
        addNote(title, text, categoryId);
    });

    document.getElementById('noteInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const title = document.getElementById('noteTitle').value;
            const categoryId = document.getElementById('noteCategory').value;
            addNote(title, e.target.value, categoryId);
        }
    });

    // Категории
    document.getElementById('addCategoryBtn').addEventListener('click', () => {
        document.getElementById('categoryModal').classList.add('active');
    });
    document.getElementById('createCategoryBtn').addEventListener('click', () => {
        const name = document.getElementById('newCategoryName').value;
        const color = document.getElementById('newCategoryColor').value;
        createCategory(name, color);
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

    // Фильтр по категории
    document.getElementById('categoryFilter').addEventListener('change', (e) => {
        setActiveCategory(e.target.value);
    });
    document.getElementById('clearFilterBtn').addEventListener('click', () => {
        setActiveCategory('all');
    });

    // Сортировка
    document.getElementById('sortNewBtn').addEventListener('click', async () => {
        state.sortOrder = 'new';
        await updateSettings({ sort_order: state.sortOrder, view_mode: state.viewMode });
        const { loadAllNotes } = await import('./main.js');
        loadAllNotes();
    });
    document.getElementById('sortOldBtn').addEventListener('click', async () => {
        state.sortOrder = 'old';
        await updateSettings({ sort_order: state.sortOrder, view_mode: state.viewMode });
        const { loadAllNotes } = await import('./main.js');
        loadAllNotes();
    });

    // Режимы отображения
    document.getElementById('viewListBtn').addEventListener('click', async () => {
        state.viewMode = 'list';
        await updateSettings({ sort_order: state.sortOrder, view_mode: state.viewMode });
        setupViewMode(state);
        displayNotes(state);
    });
    document.getElementById('viewGridBtn').addEventListener('click', async () => {
        state.viewMode = 'grid';
        await updateSettings({ sort_order: state.sortOrder, view_mode: state.viewMode });
        setupViewMode(state);
        displayNotes(state);
    });

    // Экспорт/импорт (заглушки, нужно реализовать позже)
    document.getElementById('exportBtn').addEventListener('click', () => {
        alert('Экспорт будет реализован позже');
    });
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', (e) => {
        alert('Импорт будет реализован позже');
        e.target.value = '';
    });

    // Очистка всех данных
    document.getElementById('clearAllBtn').addEventListener('click', async () => {
        if (state.allNotes.length === 0 && state.categories.filter(c => c.custom).length === 0) {
            alert('Нет данных для очистки');
            return;
        }
        if (!confirm('Удалить ВСЕ заметки и пользовательские категории?')) return;
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
            filterNotesByCategory(state);
            displayNotes(state);
            await updateCategoriesUI(state);
            alert('Все данные очищены');
        } catch (error) {
            alert('Ошибка при очистке');
        }
    });
}