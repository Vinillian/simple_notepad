// ====================
// ГЛАВНЫЕ ПЕРЕМЕННЫЕ
// ====================
let notes = []; // Массив для хранения всех заметок
let categories = []; // Массив для хранения категорий
let activeCategory = 'all'; // Активная категория для фильтрации
let editingNoteId = null; // ID редактируемой заметки
let sortOrder = 'new'; // Порядок сортировки: 'new' или 'old'
let viewMode = 'list'; // Режим отображения: 'list' или 'grid'

// Только категория "Все заметки" стандартная, остальные будут пользовательскими
const DEFAULT_CATEGORIES = [
    { id: 'all', name: 'Все заметки', color: '#7f8c8d', custom: false }
];

// ========== ДЛЯ ССЫЛОК ==========
let linkPreviewCache = new Map();
let fetchQueue = new Map();
let isFetching = false;

// ====================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ====================
function initApp() {
    console.log('Инициализация приложения...');
    
    loadSettings();
    loadCategories();
    loadNotes();
    setupEventListeners();
    setupAutoResize();
    setupViewMode();
    setupSortOrder();
    updateStats();
    
    console.log('Приложение готово!');
}

// ====================
// НАСТРОЙКИ ПРИЛОЖЕНИЯ
// ====================
function loadSettings() {
    const savedSettings = localStorage.getItem('notebookSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        sortOrder = settings.sortOrder || 'new';
        viewMode = settings.viewMode || 'list';
    }
}

function saveSettings() {
    const settings = { sortOrder, viewMode };
    localStorage.setItem('notebookSettings', JSON.stringify(settings));
}

// ====================
// РАБОТА С КАТЕГОРИЯМИ (без изменений, сохранена как в предыдущей версии)
// ====================
function loadCategories() {
    const savedCategories = localStorage.getItem('notebookCategories');
    if (savedCategories) {
        categories = JSON.parse(savedCategories);
        if (!categories.some(cat => cat.id === 'all')) {
            categories.unshift(DEFAULT_CATEGORIES[0]);
        }
    } else {
        categories = [...DEFAULT_CATEGORIES];
        const exampleCategories = [
            { id: 'thinking', name: 'Размышления', color: '#4CAF50', custom: true },
            { id: 'tasks', name: 'Задачи', color: '#2196F3', custom: true },
            { id: 'ideas', name: 'Идеи', color: '#FF9800', custom: true }
        ];
        categories.push(...exampleCategories);
        saveCategories();
    }
    updateCategoriesUI();
    updateCategorySelects();
}

function saveCategories() {
    localStorage.setItem('notebookCategories', JSON.stringify(categories));
    updateCategoriesUI();
    updateCategorySelects();
}

function createCategory(name, color) {
    if (!name || name.trim() === '') {
        alert('Введите название категории!');
        return;
    }
    if (categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
        alert('Категория с таким названием уже существует!');
        return;
    }
    const newCategory = {
        id: 'cat_' + Date.now(),
        name: name.trim(),
        color: color,
        custom: true
    };
    categories.push(newCategory);
    saveCategories();
    document.getElementById('newCategoryName').value = '';
    console.log('Создана новая категория:', newCategory);
}

function updateCategoriesUI() {
    const categoriesList = document.getElementById('categoriesList');
    const categoriesManager = document.getElementById('categoriesManager');
    categoriesList.innerHTML = '';
    categoriesManager.innerHTML = '';

    const notesByCategory = {};
    notes.forEach(note => {
        notesByCategory[note.category] = (notesByCategory[note.category] || 0) + 1;
    });
    const totalNotesCount = notes.length;

    categories.forEach(category => {
        let count = notesByCategory[category.id] || 0;
        if (category.id === 'all') count = totalNotesCount;

        const categoryItem = document.createElement('div');
        categoryItem.className = `category-item ${activeCategory === category.id ? 'active' : ''}`;
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

    categories.forEach(category => {
        const managerItem = document.createElement('div');
        managerItem.className = 'category-manager-item';
        let deleteButton = '';
        let categoryType = '';
        if (category.id === 'all') {
            categoryType = '<span style="font-size: 12px; color: #95a5a6; margin-left: 10px;">(системная)</span>';
            deleteButton = '<span style="color: #95a5a6; font-size: 12px;">не удаляемая</span>';
        } else {
            categoryType = '<span style="font-size: 12px; color: #666; margin-left: 10px;">(пользовательская)</span>';
            deleteButton = `<button onclick="deleteCategory('${category.id}')" class="delete-category-btn" title="Удалить категорию">🗑️</button>`;
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
        categoriesManager.appendChild(managerItem);
    });
}

function updateCategorySelects() {
    const noteCategorySelect = document.getElementById('noteCategory');
    const categoryFilterSelect = document.getElementById('categoryFilter');
    noteCategorySelect.innerHTML = '<option value="">Выберите категорию</option>';
    categoryFilterSelect.innerHTML = '<option value="all">Все категории</option>';

    categories.forEach(category => {
        if (category.id !== 'all') {
            const option1 = document.createElement('option');
            option1.value = category.id;
            option1.textContent = category.name;
            option1.style.color = category.color;
            option1.style.backgroundColor = '#ffffff';
            noteCategorySelect.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = category.id;
            option2.textContent = category.name;
            option2.style.color = category.color;
            option2.style.backgroundColor = '#ffffff';
            categoryFilterSelect.appendChild(option2);
        }
    });
    const firstCategory = categories.find(c => c.id !== 'all');
    if (firstCategory) noteCategorySelect.value = firstCategory.id;
}

function deleteCategory(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    if (category.id === 'all') {
        alert('Категорию "Все заметки" нельзя удалить!');
        return;
    }
    const notesInCategory = notes.filter(note => note.category === categoryId);
    if (notesInCategory.length > 0) {
        const action = prompt(
            `В категории "${category.name}" есть ${notesInCategory.length} заметок.\n\n` +
            'Выберите действие:\n1 - Удалить категорию и все заметки в ней\n2 - Переместить заметки в другую категорию\n3 - Отмена'
        );
        if (action === '1') {
            notes = notes.filter(note => note.category !== categoryId);
            saveNotes();
            categories = categories.filter(cat => cat.id !== categoryId);
            saveCategories();
            if (activeCategory === categoryId) setActiveCategory('all');
            alert(`Категория "${category.name}" и все заметки в ней удалены.`);
        } else if (action === '2') {
            showMoveNotesDialog(categoryId, category.name, notesInCategory.length);
            return;
        } else {
            console.log('Удаление категории отменено');
            return;
        }
    } else {
        if (confirm(`Удалить категорию "${category.name}"?`)) {
            categories = categories.filter(cat => cat.id !== categoryId);
            saveCategories();
            if (activeCategory === categoryId) setActiveCategory('all');
            alert(`Категория "${category.name}" удалена.`);
        }
    }
}

function showMoveNotesDialog(categoryId, categoryName, notesCount) {
    const moveDialog = document.createElement('div');
    moveDialog.className = 'modal active';
    moveDialog.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Переместить заметки</h2>
                <button class="close-modal" onclick="closeMoveDialog()">&times;</button>
            </div>
            <div class="modal-body">
                <p>В категории "${categoryName}" находится ${notesCount} заметок.</p>
                <p>Выберите новую категорию для этих заметок:</p>
                <select id="targetCategorySelect" class="category-select" style="width: 100%; margin: 15px 0;">
                    <option value="">Выберите категорию</option>
                </select>
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button onclick="closeMoveDialog()" class="cancel-edit-btn">Отмена</button>
                    <button onclick="moveNotesToCategory('${categoryId}')" class="save-edit-btn">Переместить</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(moveDialog);
    const select = document.getElementById('targetCategorySelect');
    categories.forEach(cat => {
        if (cat.id !== categoryId && cat.id !== 'all') {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            option.style.color = cat.color;
            option.style.backgroundColor = '#ffffff';
            select.appendChild(option);
        }
    });
}

function closeMoveDialog() {
    const dialog = document.querySelector('.modal.active');
    if (dialog && dialog !== document.getElementById('categoryModal')) dialog.remove();
}

function moveNotesToCategory(oldCategoryId) {
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
    const newCategory = categories.find(c => c.id === newCategoryId);
    if (!newCategory) {
        alert('Выбранная категория не найдена!');
        return;
    }
    notes.forEach(note => {
        if (note.category === oldCategoryId) note.category = newCategoryId;
    });
    categories = categories.filter(cat => cat.id !== oldCategoryId);
    saveNotes();
    saveCategories();
    if (activeCategory === oldCategoryId) setActiveCategory('all');
    closeMoveDialog();
    document.getElementById('categoryModal').classList.remove('active');
    alert(`Заметки перемещены в категорию "${newCategory.name}". Категория удалена.`);
}

function setActiveCategory(categoryId) {
    activeCategory = categoryId;
    document.getElementById('activeCategory').textContent = 
        categoryId === 'all' ? 'Все' : categories.find(c => c.id === categoryId)?.name || 'Все';
    updateCategoriesUI();
    displayNotes();
    document.getElementById('categoryFilter').value = categoryId;
}

// ====================
// ЗАГРУЗКА ЗАМЕТОК (с добавлением заголовков для старых)
// ====================
function loadNotes() {
    const savedNotes = localStorage.getItem('simpleNotes');
    if (savedNotes) {
        notes = JSON.parse(savedNotes);
        console.log('Загружено заметок:', notes.length);
        
        notes.forEach(note => {
            // Добавляем недостающие поля
            if (!note.createdTimestamp) {
                note.createdTimestamp = note.timestamp || Date.now();
                note.updatedTimestamp = Date.now();
            }
            if (!note.id) note.id = Date.now() + Math.random();
            if (!note.category) note.category = 'all';
            if (!note.content) note.content = '';
            if (!note.date) {
                note.date = new Date(note.createdTimestamp).toLocaleString('ru-RU', {
                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                });
            }
            if (!note.expanded) note.expanded = false;
            if (!note.editMode) note.editMode = false;
            
            // ДОБАВЛЕНО: заголовок
            if (!note.title) {
                // Генерируем заголовок из первых слов контента
                let raw = note.content.trim();
                if (note.type === 'link') {
                    // Для ссылок используем домен или "Ссылка"
                    note.title = getDomainFromUrl(note.content) || 'Ссылка';
                } else {
                    // Для текста берём первую строку или первые 30 символов
                    const firstLine = raw.split('\n')[0];
                    note.title = firstLine.length > 30 ? firstLine.substring(0, 30) + '…' : firstLine;
                }
                // Если совсем пусто
                if (!note.title) note.title = 'Без названия';
            }
            
            // Для ссылок
            if (note.type === undefined) {
                note.type = isValidURL(note.content.trim()) && note.content.trim().split('\n').length === 1 ? 'link' : 'note';
            }
            if (note.type === 'link' && !note.metadata) {
                note.metadata = null;
            }
        });
        
        saveNotes();
        displayNotes();
        
        setTimeout(() => {
            loadMetadataForNewLinks();
        }, 2000);
    } else {
        notes = [];
        console.log('Сохраненных заметок не найдено');
    }
}

// ====================
// СОХРАНЕНИЕ ЗАМЕТОК
// ====================
function saveNotes() {
    notes.forEach(note => {
        if (!note.createdTimestamp) note.createdTimestamp = Date.now();
        if (!note.updatedTimestamp) note.updatedTimestamp = Date.now();
        if (!note.id) note.id = Date.now() + Math.random();
        if (!note.title) note.title = 'Без названия';
        if (note.type === undefined) {
            note.type = isValidURL(note.content.trim()) && note.content.trim().split('\n').length === 1 ? 'link' : 'note';
        }
        if (note.type === 'link' && !note.metadata) {
            note.metadata = null;
        }
    });
    localStorage.setItem('simpleNotes', JSON.stringify(notes));
    console.log('Заметки сохранены, всего:', notes.length);
    updateStats();
    updateCategoriesUI();
}

// ====================
// ДОБАВЛЕНИЕ ЗАМЕТКИ (с заголовком)
// ====================
function addNote(title, text, categoryId) {
    if (!text || text.trim() === '') {
        alert('Введите текст заметки!');
        return;
    }
    if (!categoryId || categoryId === '') {
        alert('Выберите категорию для заметки!');
        return;
    }
    if (categoryId === 'all') {
        alert('Нельзя создать заметку в категории "Все заметки"! Выберите другую категорию.');
        return;
    }
    const category = categories.find(c => c.id === categoryId);
    if (!category) {
        alert('Выбранная категория не существует!');
        return;
    }
    
    const trimmedText = text.trim();
    const isLink = isValidURL(trimmedText) && trimmedText.split('\n').length === 1;
    
    // Если заголовок не указан, генерируем
    let finalTitle = title.trim();
    if (!finalTitle) {
        if (isLink) {
            finalTitle = getDomainFromUrl(trimmedText) || 'Ссылка';
        } else {
            const firstLine = trimmedText.split('\n')[0];
            finalTitle = firstLine.length > 30 ? firstLine.substring(0, 30) + '…' : firstLine;
        }
    }
    
    const now = Date.now();
    const newNote = {
        id: now,
        title: finalTitle,
        content: trimmedText,
        category: categoryId,
        date: new Date().toLocaleString('ru-RU', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }),
        createdTimestamp: now,
        updatedTimestamp: now,
        expanded: false,
        editMode: false,
        type: isLink ? 'link' : 'note',
        metadata: isLink ? null : undefined
    };
    
    notes.unshift(newNote);
    saveNotes();
    displayNotes();
    
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteInput').value = '';
    document.getElementById('charCount').textContent = '0';
    autoResizeTextarea(document.getElementById('noteInput'));
    
    console.log('Добавлена заметка:', newNote);
    
    if (isLink) {
        setTimeout(() => fetchLinkMetadata(newNote.id, trimmedText), 500);
    }
}

// ====================
// УДАЛЕНИЕ ЗАМЕТКИ
// ====================
function deleteNote(id) {
    if (confirm('Удалить эту заметку?')) {
        notes = notes.filter(note => note.id !== id);
        saveNotes();
        displayNotes();
        console.log('Заметка удалена, ID:', id);
    }
}

// ====================
// СОХРАНЕНИЕ ОТРЕДАКТИРОВАННОЙ ЗАМЕТКИ
// ====================
function saveEditedNote(id, newTitle, newContent) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    if (!newContent || newContent.trim() === '') {
        alert('Текст заметки не может быть пустым!');
        return;
    }
    
    const trimmed = newContent.trim();
    const wasLink = note.type === 'link';
    const isNowLink = isValidURL(trimmed) && trimmed.split('\n').length === 1;
    
    // Если заголовок пустой, генерируем
    let finalTitle = newTitle.trim();
    if (!finalTitle) {
        if (isNowLink) {
            finalTitle = getDomainFromUrl(trimmed) || 'Ссылка';
        } else {
            const firstLine = trimmed.split('\n')[0];
            finalTitle = firstLine.length > 30 ? firstLine.substring(0, 30) + '…' : firstLine;
        }
    }
    
    note.title = finalTitle;
    note.content = trimmed;
    note.date = new Date().toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    note.updatedTimestamp = Date.now();
    note.editMode = false;
    editingNoteId = null;
    
    if (isNowLink) {
        note.type = 'link';
        if (!note.metadata) note.metadata = null;
    } else {
        note.type = 'note';
        delete note.metadata;
    }
    
    saveNotes();
    displayNotes();
    console.log('Заметка отредактирована, ID:', id);
    
    if (isNowLink && (!wasLink || note.content !== trimmed)) {
        setTimeout(() => fetchLinkMetadata(note.id, note.content), 500);
    }
}

// ====================
// РЕДАКТИРОВАНИЕ ЗАМЕТКИ (вызов режима)
// ====================
function editNote(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    
    notes.forEach(n => n.editMode = false);
    note.editMode = true;
    editingNoteId = id;
    displayNotes();
    
    setTimeout(() => {
        const editTitle = document.querySelector(`[data-id="${id}"] .edit-title`);
        const editTextarea = document.querySelector(`[data-id="${id}"] .edit-textarea`);
        if (editTextarea) {
            if (editTitle) editTitle.focus();
            else editTextarea.focus();
            editTextarea.setSelectionRange(editTextarea.value.length, editTextarea.value.length);
            autoResizeTextarea(editTextarea);
            
            editTextarea.addEventListener('input', function() {
                const hasMarkdown = containsMarkdown(this.value);
                if (hasMarkdown) this.classList.add('markdown-editor');
                else this.classList.remove('markdown-editor');
            });
        }
    }, 100);
}

function cancelEditNote(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    note.editMode = false;
    editingNoteId = null;
    displayNotes();
}

function toggleNoteExpansion(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    note.expanded = !note.expanded;
    displayNotes();
}

// ====================
// СОРТИРОВКА
// ====================
function setSortOrder(order) {
    sortOrder = order;
    document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
    if (order === 'new') {
        document.getElementById('sortNewBtn').classList.add('active');
        document.getElementById('sortOrder').textContent = 'новые';
    } else {
        document.getElementById('sortOldBtn').classList.add('active');
        document.getElementById('sortOrder').textContent = 'старые';
    }
    saveSettings();
    displayNotes();
    console.log('Сортировка установлена:', order);
}

function setupSortOrder() {
    setSortOrder(sortOrder);
}

function getSortedNotes(notesArray) {
    const sorted = [...notesArray];
    sorted.sort((a, b) => sortOrder === 'new' ? b.createdTimestamp - a.createdTimestamp : a.createdTimestamp - b.createdTimestamp);
    return sorted;
}

// ====================
// РЕЖИМ ОТОБРАЖЕНИЯ
// ====================
function setViewMode(mode) {
    viewMode = mode;
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    if (mode === 'list') {
        document.getElementById('viewListBtn').classList.add('active');
        document.getElementById('notesContainer').className = 'notes-container list-view';
    } else {
        document.getElementById('viewGridBtn').classList.add('active');
        document.getElementById('notesContainer').className = 'notes-container grid-view';
    }
    saveSettings();
    console.log('Режим отображения установлен:', mode);
}

function setupViewMode() {
    setViewMode(viewMode);
}

// ====================
// MARKDOWN ФУНКЦИИ (без изменений)
// ====================
marked.setOptions({ breaks: true, gfm: true, headerIds: false });

function containsMarkdown(text) {
    const markdownPatterns = [
        /^#+\s/m, /\*\*.*\*\*/, /\*.*\*/, /^> /m, /^-\s/m, /^\d+\.\s/m,
        /`[^`]+`/, /^```[\s\S]*?^```/m, /\[.*\]\(.*\)/, /!\[.*\]\(.*\)/,
        /^\|.*\|$/m, /^---/m, /~~.*~~/
    ];
    return markdownPatterns.some(pattern => pattern.test(text));
}

function renderMarkdown(text) {
    if (!containsMarkdown(text)) return text.replace(/\n/g, '<br>');
    try {
        return marked.parse(text);
    } catch (error) {
        console.error('Ошибка парсинга Markdown:', error);
        return text.replace(/\n/g, '<br>');
    }
}

function insertMarkdown(button, type) {
    const noteEdit = button.closest('.note-edit');
    const textarea = noteEdit.querySelector('.edit-textarea');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    let insertText = '';
    switch(type) {
        case 'H1': insertText = selectedText ? `# ${selectedText}\n` : '# Заголовок\n'; break;
        case 'H2': insertText = selectedText ? `## ${selectedText}\n` : '## Подзаголовок\n'; break;
        case 'Bold': insertText = `**${selectedText || 'текст'}**`; break;
        case 'Italic': insertText = `*${selectedText || 'текст'}*`; break;
        case 'Code': insertText = `\`${selectedText || 'код'}\``; break;
        case 'CodeBlock': insertText = `\`\`\`\n${selectedText || '// ваш код'}\n\`\`\`\n`; break;
        case 'Link': insertText = `[${selectedText || 'текст'}](https://ссылка)`; break;
        case 'List': insertText = `- ${selectedText || 'элемент списка'}\n`; break;
        case 'Quote': insertText = `> ${selectedText || 'цитата'}\n`; break;
    }
    textarea.value = textarea.value.substring(0, start) + insertText + textarea.value.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + insertText.length - (selectedText ? 0 : insertText.length);
    textarea.focus();
    textarea.dispatchEvent(new Event('input'));
}

function toggleMarkdownPreview(button, noteId) {
    const noteEdit = button.closest('.note-edit');
    const textarea = noteEdit.querySelector('.edit-textarea');
    let preview = noteEdit.querySelector('.markdown-preview');
    if (!preview) {
        preview = document.createElement('div');
        preview.className = 'markdown-preview';
        noteEdit.insertBefore(preview, button.closest('.edit-actions'));
        const updatePreview = () => { preview.innerHTML = renderMarkdown(textarea.value); };
        textarea.addEventListener('input', updatePreview);
        updatePreview();
    }
    preview.classList.toggle('active');
    button.classList.toggle('active');
    button.textContent = preview.classList.contains('active') ? 'Редактировать' : 'Предпросмотр';
}

function showMarkdownHelp() {
    let help = document.querySelector('.markdown-help');
    if (!help) {
        help = document.createElement('div');
        help.className = 'markdown-help';
        help.innerHTML = `
            <h4>Markdown шпаргалка</h4>
            <table>
                <tr><td><code># Заголовок</code></td><td>Заголовок H1</td></tr>
                <tr><td><code>## Заголовок</code></td><td>Заголовок H2</td></tr>
                <tr><td><code>**жирный**</code></td><td>Жирный текст</td></tr>
                <tr><td><code>*курсив*</code></td><td>Курсив</td></tr>
                <tr><td><code>\`код\`</code></td><td>Встроенный код</td></tr>
                <tr><td><code>\`\`\`</code></td><td>Блок кода</td></tr>
                <tr><td><code>- список</code></td><td>Маркированный список</td></tr>
                <tr><td><code>> цитата</code></td><td>Цитата</td></tr>
                <tr><td><code>[текст](ссылка)</code></td><td>Ссылка</td></tr>
                <tr><td><code>---</code></td><td>Горизонтальная линия</td></tr>
            </table>
            <button onclick="this.closest('.markdown-help').remove()" style="margin-top:10px; padding:5px 10px; background:#6c757d; color:white; border:none; border-radius:4px; cursor:pointer;">Закрыть</button>
        `;
        document.body.appendChild(help);
        setTimeout(() => {
            document.addEventListener('click', (e) => { if (!help.contains(e.target)) help.remove(); });
        }, 100);
    }
    help.classList.add('active');
}

function createMarkdownToolbarHtml() {
    return `
        <div class="markdown-toolbar">
            <button class="markdown-tool" onclick="insertMarkdown(this, 'H1')" title="Заголовок 1">H1</button>
            <button class="markdown-tool" onclick="insertMarkdown(this, 'H2')" title="Заголовок 2">H2</button>
            <button class="markdown-tool" onclick="insertMarkdown(this, 'Bold')" title="Жирный текст">B</button>
            <button class="markdown-tool" onclick="insertMarkdown(this, 'Italic')" title="Курсив">I</button>
            <button class="markdown-tool" onclick="insertMarkdown(this, 'Code')" title="Встроенный код">\`</button>
            <button class="markdown-tool" onclick="insertMarkdown(this, 'CodeBlock')" title="Блок кода">\`\`\`</button>
            <button class="markdown-tool" onclick="insertMarkdown(this, 'Link')" title="Ссылка">Link</button>
            <button class="markdown-tool" onclick="insertMarkdown(this, 'List')" title="Маркированный список">-</button>
            <button class="markdown-tool" onclick="insertMarkdown(this, 'Quote')" title="Цитата">></button>
            <button class="markdown-tool" onclick="showMarkdownHelp()" title="Помощь по Markdown">?</button>
        </div>
    `;
}

// ====================
// ФУНКЦИИ ДЛЯ ССЫЛОК (из notes 12.0, без изменений)
// ====================
function isValidURL(string) {
    try { const url = new URL(string); return url.protocol === 'http:' || url.protocol === 'https:'; } catch (_) { return false; }
}

function getDomainFromUrl(url) {
    try { const urlObj = new URL(url); return urlObj.hostname.replace('www.', ''); } catch (e) { return url; }
}

function getFaviconUrl(url) {
    try { const urlObj = new URL(url); return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`; } catch (e) { return ''; }
}

function getShortDescription(metadata) {
    if (!metadata || !metadata.description) return '';
    const desc = metadata.description.trim();
    return desc.length <= 100 ? desc : desc.substring(0, 100) + '...';
}

function getShortTitle(title) {
    if (!title) return '';
    return title.length <= 50 ? title : title.substring(0, 47) + '...';
}

async function fetchLinkMetadata(noteId, url) {
    if (linkPreviewCache.has(url)) {
        const metadata = linkPreviewCache.get(url);
        updateNoteMetadata(noteId, metadata);
        return;
    }
    if (fetchQueue.has(url) || isFetching) {
        fetchQueue.set(url, noteId);
        return;
    }
    fetchQueue.set(url, noteId);
    await processNextInQueue();
}

async function processNextInQueue() {
    if (isFetching || fetchQueue.size === 0) return;
    isFetching = true;
    const [url, noteId] = Array.from(fetchQueue.entries())[0];
    try {
        const encodedUrl = encodeURIComponent(url);
        const apiUrl = `https://api.microlink.io/?url=${encodedUrl}&audio=false&video=false&iframe=false`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        const metadata = {
            title: data.data.title || '',
            description: data.data.description || '',
            image: data.data.image?.url || data.data.logo?.url || '',
            siteName: data.data.publisher || getDomainFromUrl(url)
        };
        metadata.title = metadata.title.trim().substring(0, 200);
        metadata.description = metadata.description.trim().substring(0, 300);
        linkPreviewCache.set(url, metadata);
        updateNoteMetadata(noteId, metadata);
    } catch (error) {
        console.error('Ошибка получения метаданных:', error);
        const fallbackMetadata = { title: '', description: '', image: '', siteName: getDomainFromUrl(url) };
        linkPreviewCache.set(url, fallbackMetadata);
        updateNoteMetadata(noteId, fallbackMetadata);
    } finally {
        fetchQueue.delete(url);
        isFetching = false;
        if (fetchQueue.size > 0) setTimeout(() => processNextInQueue(), 1000);
    }
}

function updateNoteMetadata(noteId, metadata) {
    const note = notes.find(n => n.id === noteId);
    if (note) {
        note.metadata = metadata;
        // Если заголовок пустой, можно заполнить из метаданных
        if (note.type === 'link' && !note.title && metadata.title) {
            note.title = getShortTitle(metadata.title);
        }
        saveNotes();
        displayNotes();
    }
}

function loadMetadataForNewLinks() {
    const linksWithoutMetadata = notes.filter(item => item.type === 'link' && !item.metadata).slice(0, 5);
    linksWithoutMetadata.forEach((item, index) => {
        setTimeout(() => fetchLinkMetadata(item.id, item.content), index * 2000);
    });
}

function renderLinkContent(note) {
    const url = note.content.trim();
    const domain = getDomainFromUrl(url);
    const faviconUrl = getFaviconUrl(url);
    const metadata = note.metadata || {};
    let html = '<div class="link-item">';
    html += '<div class="link-header">';
    if (faviconUrl) html += `<img src="${faviconUrl}" alt="favicon" class="link-favicon" loading="lazy">`;
    else html += '<i class="fas fa-link link-icon-placeholder"></i>';
    html += `<a href="${url}" target="_blank" rel="noopener noreferrer" class="link-url">${getShortTitle(metadata.title || note.title || domain)}</a>`;
    html += '</div>';
    html += `<div class="link-domain">${domain}</div>`;
    if (metadata.description) html += `<div class="link-description">${getShortDescription(metadata)}</div>`;
    html += '</div>';
    return html;
}

// ====================
// ОТОБРАЖЕНИЕ ЗАМЕТОК (с заголовком)
// ====================
function displayNotes() {
    const notesContainer = document.getElementById('notesContainer');
    if (notes.length === 0) {
        notesContainer.innerHTML = '<div class="empty-message">Заметок пока нет. Добавьте первую!</div>';
        return;
    }

    let filteredNotes = notes;
    if (activeCategory !== 'all') filteredNotes = notes.filter(note => note.category === activeCategory);
    if (filteredNotes.length === 0) {
        notesContainer.innerHTML = `
            <div class="empty-message">
                В категории "${categories.find(c => c.id === activeCategory)?.name || 'этой'}" заметок нет.
                ${activeCategory !== 'all' ? '<br><button onclick="setActiveCategory(\'all\')" style="margin-top:10px; padding:8px 16px; background:#4CAF50; color:white; border:none; border-radius:6px; cursor:pointer;">Показать все заметки</button>' : ''}
            </div>
        `;
        return;
    }

    const sortedNotes = getSortedNotes(filteredNotes);
    let html = '';

    sortedNotes.forEach(note => {
        const category = categories.find(c => c.id === note.category);
        const isExpanded = note.expanded || note.content.split('\n').length <= 10;
        const hasManyLines = note.content.split('\n').length > 10;
        const hasMarkdown = containsMarkdown(note.content);
        const isLink = note.type === 'link';

        html += `
            <div class="note" data-id="${note.id}" style="border-top-color: ${category?.color || '#4CAF50'}">
                <div class="note-header">
                    <div class="note-category" style="background-color: ${category?.color || '#4CAF50'}">
                        <span class="category-color" style="background-color: ${category?.color || '#4CAF50'}"></span>
                        ${category?.name || 'Без категории'}
                        ${hasMarkdown ? '<span class="markdown-badge" title="Содержит Markdown разметку"></span>' : ''}
                        ${isLink ? '<span style="margin-left: 5px;">🔗</span>' : ''}
                    </div>
                    <div class="note-actions">
                        <button class="note-action-btn edit-btn" onclick="editNote(${note.id})" title="Редактировать">✏️</button>
                        <button class="note-action-btn delete-btn" onclick="deleteNote(${note.id})" title="Удалить">🗑️</button>
                        ${isExpanded && hasManyLines ? 
                            `<button class="note-action-btn collapse-top-btn" onclick="toggleNoteExpansion(${note.id})" title="Свернуть">⬆️</button>` : 
                            (!isExpanded ? `<button class="note-action-btn expand-btn" onclick="toggleNoteExpansion(${note.id})" title="Развернуть">⬇️</button>` : '')
                        }
                    </div>
                </div>
                
                <!-- ДОБАВЛЕНО: заголовок заметки -->
                <div class="note-title">${note.title}</div>
                
                ${note.editMode ? `
                    <div class="note-edit active">
                        ${hasMarkdown ? createMarkdownToolbarHtml() : ''}
                        <input type="text" class="edit-title" value="${note.title.replace(/"/g, '&quot;')}" placeholder="Заголовок">
                        <textarea class="edit-textarea ${hasMarkdown ? 'markdown-editor' : ''}" data-id="${note.id}" data-has-markdown="${hasMarkdown}">${note.content}</textarea>
                        <div class="edit-actions">
                            ${hasMarkdown ? '<button type="button" class="markdown-preview-btn" onclick="toggleMarkdownPreview(this, ' + note.id + ')">Предпросмотр</button>' : ''}
                            <button class="cancel-edit-btn" onclick="cancelEditNote(${note.id})">Отмена</button>
                            <button class="save-edit-btn" onclick="saveEditedNote(${note.id}, this.parentElement.parentElement.querySelector('.edit-title').value, this.parentElement.parentElement.querySelector('.edit-textarea').value)">Сохранить</button>
                        </div>
                    </div>
                ` : `
                    <div class="note-content ${isLink ? '' : 'markdown-content'} ${isExpanded ? '' : 'collapsed'}">
                        ${isLink ? renderLinkContent(note) : renderMarkdown(note.content)}
                    </div>
                    ${!isExpanded && hasManyLines && !isLink ? `
                        <button class="expand-btn" onclick="toggleNoteExpansion(${note.id})" style="background: none; border: none; color: #3498db; cursor: pointer; padding: 5px 0; text-align: left;">
                            Показать полностью...
                        </button>
                    ` : ''}
                `}
                
                <div class="note-footer">
                    <div class="note-date">${note.date}</div>
                    ${isExpanded && hasManyLines && !isLink ? `
                        <button onclick="toggleNoteExpansion(${note.id})" style="background: none; border: none; color: #95a5a6; cursor: pointer; font-size: 12px;">
                            Свернуть
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });

    notesContainer.innerHTML = html;
}

// ====================
// ЭКСПОРТ/ИМПОРТ (с учётом заголовков)
// ====================
function exportToJSON() {
    if (notes.length === 0) {
        alert('Нет заметок для экспорта');
        return;
    }
    const exportData = {
        notes: notes,
        categories: categories.filter(c => c.custom),
        settings: { sortOrder, viewMode },
        exportDate: new Date().toISOString(),
        version: '1.0'
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `notebook_export_${new Date().toISOString().slice(0,10)}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    console.log('Данные экспортированы в JSON');
}

function importFromJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
        alert('Пожалуйста, выберите JSON файл');
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            if (!importData.notes || !Array.isArray(importData.notes)) {
                throw new Error('Некорректный формат файла');
            }
            if (confirm(`Импортировать ${importData.notes.length} заметок и ${importData.categories?.length || 0} категорий? Существующие данные останутся.`)) {
                if (importData.categories && Array.isArray(importData.categories)) {
                    importData.categories.forEach(importedCat => {
                        if (!categories.some(cat => cat.id === importedCat.id)) {
                            importedCat.custom = true;
                            categories.push(importedCat);
                        }
                    });
                    saveCategories();
                }
                importData.notes.forEach(importedNote => {
                    importedNote.id = Date.now() + Math.random();
                    importedNote.createdTimestamp = importedNote.createdTimestamp || importedNote.timestamp || Date.now();
                    importedNote.updatedTimestamp = importedNote.updatedTimestamp || Date.now();
                    if (!categories.some(cat => cat.id === importedNote.category)) {
                        importedNote.category = 'all';
                    }
                    if (importedNote.type === undefined) {
                        importedNote.type = isValidURL(importedNote.content) ? 'link' : 'note';
                    }
                    if (importedNote.type === 'link' && !importedNote.metadata) {
                        importedNote.metadata = null;
                    }
                    // ДОБАВЛЕНО: если нет заголовка, генерируем
                    if (!importedNote.title) {
                        if (importedNote.type === 'link') {
                            importedNote.title = getDomainFromUrl(importedNote.content) || 'Ссылка';
                        } else {
                            const firstLine = importedNote.content.split('\n')[0];
                            importedNote.title = firstLine.length > 30 ? firstLine.substring(0, 30) + '…' : firstLine;
                        }
                    }
                    notes.unshift(importedNote);
                });
                if (importData.settings) {
                    if (importData.settings.sortOrder) sortOrder = importData.settings.sortOrder;
                    if (importData.settings.viewMode) viewMode = importData.settings.viewMode;
                    saveSettings();
                    setupSortOrder();
                    setupViewMode();
                }
                saveNotes();
                displayNotes();
                alert(`Успешно импортировано ${importData.notes.length} заметок`);
                console.log('Данные импортированы из JSON');
                setTimeout(() => loadMetadataForNewLinks(), 2000);
            }
        } catch (error) {
            alert('Ошибка при чтении файла: ' + error.message);
            console.error('Ошибка импорта:', error);
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}

// ====================
// ОЧИСТКА ВСЕХ ДАННЫХ
// ====================
function clearAllData() {
    if (notes.length === 0 && categories.filter(c => c.custom).length === 0) {
        alert('Нет данных для очистки');
        return;
    }
    if (confirm('Удалить ВСЕ заметки и пользовательские категории? Это действие нельзя отменить.')) {
        notes = [];
        categories = [
            DEFAULT_CATEGORIES[0],
            { id: 'thinking', name: 'Размышления', color: '#4CAF50', custom: true },
            { id: 'tasks', name: 'Задачи', color: '#2196F3', custom: true },
            { id: 'ideas', name: 'Идеи', color: '#FF9800', custom: true }
        ];
        activeCategory = 'all';
        editingNoteId = null;
        saveNotes();
        saveCategories();
        setActiveCategory('all');
        displayNotes();
        alert('Все данные очищены');
        console.log('Все данные очищены');
    }
}

// ====================
// ВСПОМОГАТЕЛЬНЫЕ
// ====================
function updateStats() {
    document.getElementById('totalNotes').textContent = notes.length;
    document.getElementById('totalCategories').textContent = categories.filter(c => c.custom).length;
}

function setupAutoResize() {
    const textarea = document.getElementById('noteInput');
    textarea.addEventListener('input', function() {
        autoResizeTextarea(this);
        document.getElementById('charCount').textContent = this.value.length;
        if (this.scrollHeight > 400) this.style.overflowY = 'auto';
    });
    autoResizeTextarea(textarea);
}

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 400);
    textarea.style.height = newHeight + 'px';
    textarea.style.overflowY = textarea.scrollHeight > 400 ? 'auto' : 'hidden';
}

// ====================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ====================
function setupEventListeners() {
    document.getElementById('saveBtn').addEventListener('click', () => {
        const title = document.getElementById('noteTitle').value;
        const text = document.getElementById('noteInput').value;
        const categoryId = document.getElementById('noteCategory').value;
        addNote(title, text, categoryId);
    });

    document.getElementById('noteInput').addEventListener('keydown', function(e) {
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

    document.getElementById('categoryFilter').addEventListener('change', function() {
        setActiveCategory(this.value);
    });

    document.getElementById('clearFilterBtn').addEventListener('click', () => {
        setActiveCategory('all');
    });

    document.getElementById('sortNewBtn').addEventListener('click', () => setSortOrder('new'));
    document.getElementById('sortOldBtn').addEventListener('click', () => setSortOrder('old'));

    document.getElementById('viewListBtn').addEventListener('click', () => setViewMode('list'));
    document.getElementById('viewGridBtn').addEventListener('click', () => setViewMode('grid'));

    document.getElementById('exportBtn').addEventListener('click', exportToJSON);
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', importFromJSON);

    document.getElementById('clearAllBtn').addEventListener('click', clearAllData);
}

// ====================
// ЗАПУСК
// ====================
document.addEventListener('DOMContentLoaded', initApp);

// Отладка
function debugInfo() {
    console.log('=== ДЕБАГ ИНФОРМАЦИЯ ===');
    console.log('Всего заметок:', notes.length);
    console.log('Всего категорий:', categories.filter(c => c.custom).length);
    console.log('Активная категория:', activeCategory);
    console.log('Режим сортировки:', sortOrder);
    console.log('Режим отображения:', viewMode);
    console.log('Редактируемая заметка:', editingNoteId);
    console.log('Заметки:', notes);
    console.log('Категории:', categories);
    console.log('localStorage заметки:', localStorage.getItem('simpleNotes'));
    console.log('localStorage категории:', localStorage.getItem('notebookCategories'));
    console.log('localStorage настройки:', localStorage.getItem('notebookSettings'));
    console.log('====================');
}