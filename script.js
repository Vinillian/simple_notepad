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

// ====================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ====================
function initApp() {
    console.log('Инициализация приложения...');
    
    // Загружаем настройки из localStorage
    loadSettings();
    
    // Загружаем категории
    loadCategories();
    
    // Загружаем заметки
    loadNotes();
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    // Настраиваем автоматическое расширение textarea
    setupAutoResize();
    
    // Настраиваем начальное отображение
    setupViewMode();
    setupSortOrder();
    
    // Обновляем статистику
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
    const settings = {
        sortOrder: sortOrder,
        viewMode: viewMode
    };
    
    localStorage.setItem('notebookSettings', JSON.stringify(settings));
}

// ====================
// РАБОТА С КАТЕГОРИЯМИ
// ====================
function loadCategories() {
    const savedCategories = localStorage.getItem('notebookCategories');
    
    if (savedCategories) {
        categories = JSON.parse(savedCategories);
        // Убедимся, что категория "Все" всегда есть
        if (!categories.some(cat => cat.id === 'all')) {
            categories.unshift(DEFAULT_CATEGORIES[0]);
        }
    } else {
        // Создаем только категорию "Все заметки" и несколько примеров
        categories = [...DEFAULT_CATEGORIES];
        
        // Добавляем примеры категорий для первого запуска
        const exampleCategories = [
            { id: 'thinking', name: 'Размышления', color: '#4CAF50', custom: true },
            { id: 'tasks', name: 'Задачи', color: '#2196F3', custom: true },
            { id: 'ideas', name: 'Идеи', color: '#FF9800', custom: true }
        ];
        
        categories.push(...exampleCategories);
        saveCategories();
    }
    
    // Обновляем интерфейс категорий
    updateCategoriesUI();
    // Обновляем выпадающие списки категорий
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
    
    // Проверяем, нет ли уже такой категории
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
    
    // Очищаем поле ввода
    document.getElementById('newCategoryName').value = '';
    
    console.log('Создана новая категория:', newCategory);
}

// ====================
// РАБОТА С КАТЕГОРИЯМИ
// ====================
function updateCategoriesUI() {
    const categoriesList = document.getElementById('categoriesList');
    const categoriesManager = document.getElementById('categoriesManager');
    
    // Очищаем списки
    categoriesList.innerHTML = '';
    categoriesManager.innerHTML = '';
    
    // Считаем заметки по категориям
    const notesByCategory = {};
    notes.forEach(note => {
        notesByCategory[note.category] = (notesByCategory[note.category] || 0) + 1;
    });
    
    // Подсчет ВСЕХ заметок для категории "Все"
    const totalNotesCount = notes.length;
    
    // Добавляем категории в боковую панель
    categories.forEach(category => {
        let count = notesByCategory[category.id] || 0;
        
        // Для категории "Все" показываем общее количество заметок
        if (category.id === 'all') {
            count = totalNotesCount;
        }
        
        // Боковая панель
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
    
    // Добавляем категории в менеджер категорий
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
    
    // Очищаем опции
    noteCategorySelect.innerHTML = '<option value="">Выберите категорию</option>';
    categoryFilterSelect.innerHTML = '<option value="all">Все категории</option>';
    
    // Добавляем все категории (кроме "Все") в выпадающие списки
    categories.forEach(category => {
        if (category.id !== 'all') { // Все категории кроме "Все"
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
    
    // Устанавливаем первую доступную категорию по умолчанию при создании заметки
    const firstCategory = categories.find(c => c.id !== 'all');
    if (firstCategory) {
        noteCategorySelect.value = firstCategory.id;
    }
}

function deleteCategory(categoryId) {
    // Находим категорию
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    
    // Нельзя удалить категорию "Все"
    if (category.id === 'all') {
        alert('Категорию "Все заметки" нельзя удалить!');
        return;
    }
    
    // Остальной код удаления остается без изменений...
    // Проверяем, есть ли заметки в этой категории
    const notesInCategory = notes.filter(note => note.category === categoryId);
    
    if (notesInCategory.length > 0) {
        // Предлагаем варианты
        const action = prompt(
            `В категории "${category.name}" есть ${notesInCategory.length} заметок.\n\n` +
            'Выберите действие:\n' +
            '1 - Удалить категорию и все заметки в ней\n' +
            '2 - Переместить заметки в другую категорию\n' +
            '3 - Отмена'
        );
        
        if (action === '1') {
            // Удаляем заметки этой категории
            notes = notes.filter(note => note.category !== categoryId);
            saveNotes();
            
            // Удаляем категорию
            categories = categories.filter(cat => cat.id !== categoryId);
            saveCategories();
            
            // Если удалена активная категория, переключаемся на "Все"
            if (activeCategory === categoryId) {
                setActiveCategory('all');
            }
            
            alert(`Категория "${category.name}" и все заметки в ней удалены.`);
            console.log('Категория и заметки удалены:', categoryId);
            
        } else if (action === '2') {
            // Показываем диалог выбора новой категории
            showMoveNotesDialog(categoryId, category.name, notesInCategory.length);
            return;
            
        } else {
            // Отмена
            console.log('Удаление категории отменено');
            return;
        }
        
    } else {
        // Если заметок нет - просто удаляем категорию
        if (confirm(`Удалить категорию "${category.name}"?`)) {
            categories = categories.filter(cat => cat.id !== categoryId);
            saveCategories();
            
            // Если удалена активная категория, переключаемся на "Все"
            if (activeCategory === categoryId) {
                setActiveCategory('all');
            }
            
            alert(`Категория "${category.name}" удалена.`);
            console.log('Категория удалена:', categoryId);
        }
    }
}

function showMoveNotesDialog(categoryId, categoryName, notesCount) {
    // Создаем модальное окно для перемещения заметок
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
    
    // Заполняем список категорий (исключая удаляемую)
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
    if (dialog && dialog !== document.getElementById('categoryModal')) {
        dialog.remove();
    }
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
    
    // Перемещаем заметки
    notes.forEach(note => {
        if (note.category === oldCategoryId) {
            note.category = newCategoryId;
        }
    });
    
    // Удаляем старую категорию
    categories = categories.filter(cat => cat.id !== oldCategoryId);
    
    saveNotes();
    saveCategories();
    
    // Если удалена активная категория, переключаемся на "Все"
    if (activeCategory === oldCategoryId) {
        setActiveCategory('all');
    }
    
    // Закрываем диалог
    closeMoveDialog();
    
    // Закрываем модальное окно категорий, если открыто
    document.getElementById('categoryModal').classList.remove('active');
    
    alert(`Заметки перемещены в категорию "${newCategory.name}". Категория удалена.`);
    console.log(`Заметки перемещены из ${oldCategoryId} в ${newCategoryId}`);
}

function setActiveCategory(categoryId) {
    activeCategory = categoryId;
    document.getElementById('activeCategory').textContent = 
        categoryId === 'all' ? 'Все' : categories.find(c => c.id === categoryId)?.name || 'Все';
    
    // Обновляем UI категорий
    updateCategoriesUI();
    
    // Отображаем заметки
    displayNotes();
    
    // Обновляем фильтр
    document.getElementById('categoryFilter').value = categoryId;
}

// ====================
// ФУНКЦИЯ: Загрузить заметки из памяти браузера
// ====================
function loadNotes() {
    const savedNotes = localStorage.getItem('simpleNotes');
    
    if (savedNotes) {
        notes = JSON.parse(savedNotes);
        console.log('Загружено заметок:', notes.length);
        
        // Для совместимости со старыми данными
        notes.forEach(note => {
            if (!note.createdTimestamp) {
                // Если нет createdTimestamp, используем старый timestamp или текущее время
                note.createdTimestamp = note.timestamp || Date.now();
                note.updatedTimestamp = Date.now();
            }
            
            // Гарантируем наличие всех обязательных полей
            if (!note.id) note.id = Date.now() + Math.random();
            if (!note.category) note.category = 'all'; // По умолчанию "Все"
            if (!note.content) note.content = '';
            if (!note.date) {
                note.date = new Date(note.createdTimestamp).toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
            if (!note.expanded) note.expanded = false;
            if (!note.editMode) note.editMode = false;
        });
        
        // Сохраняем обновленные заметки с новыми полями
        saveNotes();
        
        displayNotes();
    } else {
        notes = [];
        console.log('Сохраненных заметок не найдено');
    }
}

// ====================
// ФУНКЦИЯ: Сохранить заметки в память браузера
// ====================
function saveNotes() {
    // Гарантируем наличие всех полей у каждой заметки
    notes.forEach(note => {
        if (!note.createdTimestamp) note.createdTimestamp = Date.now();
        if (!note.updatedTimestamp) note.updatedTimestamp = Date.now();
        if (!note.id) note.id = Date.now() + Math.random();
    });
    
    // Преобразуем массив заметок в строку
    const notesString = JSON.stringify(notes);
    
    // Сохраняем строку в localStorage браузера
    localStorage.setItem('simpleNotes', notesString);
    
    console.log('Заметки сохранены, всего:', notes.length);
    updateStats();
    updateCategoriesUI();
}

// ====================
// ФУНКЦИЯ: Добавить новую заметку
// ====================
function addNote(text, categoryId) {
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
    
    const now = Date.now();
    const newNote = {
        id: now,
        content: text.trim(),
        category: categoryId,
        date: new Date().toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }),
        createdTimestamp: now, // Время создания
        updatedTimestamp: now, // Время последнего редактирования
        expanded: false,
        editMode: false
    };
    
    notes.unshift(newNote);
    saveNotes();
    displayNotes();
    
    // Очищаем поле ввода
    document.getElementById('noteInput').value = '';
    document.getElementById('charCount').textContent = '0';
    autoResizeTextarea(document.getElementById('noteInput'));
    
    console.log('Добавлена заметка:', newNote);
}

function deleteNote(id) {
    if (confirm('Удалить эту заметку?')) {
        notes = notes.filter(note => note.id !== id);
        saveNotes();
        displayNotes();
        console.log('Заметка удалена, ID:', id);
    }
}

// ====================
// ФУНКЦИЯ: Сохранить отредактированную заметку
// ====================
function saveEditedNote(id, newContent) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    
    if (!newContent || newContent.trim() === '') {
        alert('Текст заметки не может быть пустым!');
        return;
    }
    
    note.content = newContent.trim();
    note.date = new Date().toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    note.updatedTimestamp = Date.now(); // Обновляем только время редактирования
    note.editMode = false;
    editingNoteId = null;
    
    saveNotes();
    displayNotes();
    console.log('Заметка отредактирована, ID:', id);
}

function editNote(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    
    // Выходим из режима редактирования других заметок
    notes.forEach(n => n.editMode = false);
    
    // Входим в режим редактирования
    note.editMode = true;
    editingNoteId = id;
    displayNotes();
    
    // Фокусируемся на поле редактирования
    setTimeout(() => {
        const editTextarea = document.querySelector(`[data-id="${id}"] .edit-textarea`);
        if (editTextarea) {
            editTextarea.focus();
            editTextarea.setSelectionRange(editTextarea.value.length, editTextarea.value.length);
            autoResizeTextarea(editTextarea);
            
            // Добавляем обработчик для автоматического определения Markdown
            editTextarea.addEventListener('input', function() {
                const hasMarkdown = containsMarkdown(this.value);
                if (hasMarkdown) {
                    this.classList.add('markdown-editor');
                } else {
                    this.classList.remove('markdown-editor');
                }
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
// СОРТИРОВКА ЗАМЕТОК
// ====================
function setSortOrder(order) {
    sortOrder = order;
    
    // Обновляем UI кнопок сортировки
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (order === 'new') {
        document.getElementById('sortNewBtn').classList.add('active');
        document.getElementById('sortOrder').textContent = 'новые';
    } else {
        document.getElementById('sortOldBtn').classList.add('active');
        document.getElementById('sortOrder').textContent = 'старые';
    }
    
    // Сохраняем настройки
    saveSettings();
    
    // Перерисовываем заметки
    displayNotes();
    
    console.log('Сортировка установлена:', order);
}

function setupSortOrder() {
    setSortOrder(sortOrder);
}

function getSortedNotes(notesArray) {
    const sorted = [...notesArray];
    
    if (sortOrder === 'new') {
        // Сначала новые (по времени создания в порядке убывания)
        sorted.sort((a, b) => b.createdTimestamp - a.createdTimestamp);
    } else {
        // Сначала старые (по времени создания в порядке возрастания)
        sorted.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    }
    
    return sorted;
}

// ====================
// РЕЖИМ ОТОБРАЖЕНИЯ
// ====================
function setViewMode(mode) {
    viewMode = mode;
    
    // Обновляем UI кнопок отображения
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (mode === 'list') {
        document.getElementById('viewListBtn').classList.add('active');
        document.getElementById('notesContainer').className = 'notes-container list-view';
    } else {
        document.getElementById('viewGridBtn').classList.add('active');
        document.getElementById('notesContainer').className = 'notes-container grid-view';
    }
    
    // Сохраняем настройки
    saveSettings();
    
    console.log('Режим отображения установлен:', mode);
}

function setupViewMode() {
    setViewMode(viewMode);
}

// ====================
// MARKDOWN ФУНКЦИИ
// ====================

// Настройка marked
marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    highlight: function(code, lang) {
        // Простое подсвечивание кода
        return code;
    }
});

// Проверяет, содержит ли текст Markdown разметку
function containsMarkdown(text) {
    const markdownPatterns = [
        /^#+\s/m,              // Заголовки
        /\*\*.*\*\*/,          // Жирный текст
        /\*.*\*/,              // Курсив
        /^> /m,                // Цитаты
        /^-\s/m,               // Маркированные списки
        /^\d+\.\s/m,           // Нумерованные списки
        /`[^`]+`/,             // Встроенный код
        /^```[\s\S]*?^```/m,   // Блоки кода
        /\[.*\]\(.*\)/,        // Ссылки
        /!\[.*\]\(.*\)/,       // Изображения
        /^\|.*\|$/m,           // Таблицы
        /^---/m,               // Горизонтальные линии
        /~~.*~~/               // Зачеркнутый текст
    ];
    
    return markdownPatterns.some(pattern => pattern.test(text));
}

// Преобразует Markdown в HTML
function renderMarkdown(text) {
    if (!containsMarkdown(text)) {
        return text.replace(/\n/g, '<br>');
    }
    
    try {
        return marked.parse(text);
    } catch (error) {
        console.error('Ошибка парсинга Markdown:', error);
        return text.replace(/\n/g, '<br>');
    }
}

// Функция для вставки Markdown
function insertMarkdown(button, type) {
    const noteEdit = button.closest('.note-edit');
    const textarea = noteEdit.querySelector('.edit-textarea');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    let insertText = '';
    
    switch(type) {
        case 'H1':
            insertText = selectedText ? `# ${selectedText}\n` : '# Заголовок\n';
            break;
        case 'H2':
            insertText = selectedText ? `## ${selectedText}\n` : '## Подзаголовок\n';
            break;
        case 'Bold':
            insertText = `**${selectedText || 'текст'}**`;
            break;
        case 'Italic':
            insertText = `*${selectedText || 'текст'}*`;
            break;
        case 'Code':
            insertText = `\`${selectedText || 'код'}\``;
            break;
        case 'CodeBlock':
            insertText = `\`\`\`\n${selectedText || '// ваш код'}\n\`\`\`\n`;
            break;
        case 'Link':
            insertText = `[${selectedText || 'текст'}](https://ссылка)`;
            break;
        case 'List':
            insertText = `- ${selectedText || 'элемент списка'}\n`;
            break;
        case 'Quote':
            insertText = `> ${selectedText || 'цитата'}\n`;
            break;
    }
    
    textarea.value = textarea.value.substring(0, start) + insertText + textarea.value.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + insertText.length - (selectedText ? 0 : insertText.length);
    textarea.focus();
    textarea.dispatchEvent(new Event('input'));
}

// Переключение предпросмотра Markdown
function toggleMarkdownPreview(button, noteId) {
    const noteEdit = button.closest('.note-edit');
    const textarea = noteEdit.querySelector('.edit-textarea');
    let preview = noteEdit.querySelector('.markdown-preview');
    
    if (!preview) {
        preview = document.createElement('div');
        preview.className = 'markdown-preview';
        noteEdit.insertBefore(preview, button.closest('.edit-actions'));
        
        const updatePreview = () => {
            preview.innerHTML = renderMarkdown(textarea.value);
        };
        
        textarea.addEventListener('input', updatePreview);
        updatePreview();
    }
    
    preview.classList.toggle('active');
    button.classList.toggle('active');
    button.textContent = preview.classList.contains('active') ? 'Редактировать' : 'Предпросмотр';
}

// Показ справки по Markdown
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
                <tr><td><code>![alt](img.jpg)</code></td><td>Изображение</td></tr>
                <tr><td><code>---</code></td><td>Горизонтальная линия</td></tr>
            </table>
            <button onclick="this.closest('.markdown-help').remove()" style="margin-top: 10px; padding: 5px 10px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Закрыть</button>
        `;
        document.body.appendChild(help);
        
        // Закрытие при клике вне окна
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!help.contains(e.target)) {
                    help.remove();
                }
            });
        }, 100);
    }
    
    help.classList.add('active');
}

// HTML для панели инструментов Markdown
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
// ОТОБРАЖЕНИЕ ЗАМЕТОК
// ====================
function displayNotes() {
    const notesContainer = document.getElementById('notesContainer');
    
    if (notes.length === 0) {
        notesContainer.innerHTML = '<div class="empty-message">Заметок пока нет. Добавьте первую!</div>';
        return;
    }
    
    // Фильтруем заметки по категории
    let filteredNotes = notes;
    if (activeCategory !== 'all') {
        filteredNotes = notes.filter(note => note.category === activeCategory);
    }
    
    if (filteredNotes.length === 0) {
        notesContainer.innerHTML = `
            <div class="empty-message">
                В категории "${categories.find(c => c.id === activeCategory)?.name || 'этой'}" заметок нет.
                ${activeCategory !== 'all' ? '<br><button onclick="setActiveCategory(\'all\')" style="margin-top: 10px; padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer;">Показать все заметки</button>' : ''}
            </div>
        `;
        return;
    }
    
    // Сортируем заметки
    const sortedNotes = getSortedNotes(filteredNotes);
    
    // Создаем HTML для заметок
    let html = '';
    
    sortedNotes.forEach(note => {
        const category = categories.find(c => c.id === note.category);
        const isExpanded = note.expanded || note.content.split('\n').length <= 10;
        const hasManyLines = note.content.split('\n').length > 10;
        const hasMarkdown = containsMarkdown(note.content);
        
        html += `
            <div class="note" data-id="${note.id}" style="border-top-color: ${category?.color || '#4CAF50'}">
                <div class="note-header">
                    <div class="note-category" style="background-color: ${category?.color || '#4CAF50'}">
                        <span class="category-color" style="background-color: ${category?.color || '#4CAF50'}"></span>
                        ${category?.name || 'Без категории'}
                        ${hasMarkdown ? '<span class="markdown-badge" title="Содержит Markdown разметку"></span>' : ''}
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
                
                ${note.editMode ? `
                    <div class="note-edit active">
                        ${hasMarkdown ? createMarkdownToolbarHtml() : ''}
                        <textarea class="edit-textarea ${hasMarkdown ? 'markdown-editor' : ''}" data-id="${note.id}" data-has-markdown="${hasMarkdown}">${note.content}</textarea>
                        <div class="edit-actions">
                            ${hasMarkdown ? '<button type="button" class="markdown-preview-btn" onclick="toggleMarkdownPreview(this, ' + note.id + ')">Предпросмотр</button>' : ''}
                            <button class="cancel-edit-btn" onclick="cancelEditNote(${note.id})">Отмена</button>
                            <button class="save-edit-btn" onclick="saveEditedNote(${note.id}, this.parentElement.parentElement.querySelector('.edit-textarea').value)">Сохранить</button>
                        </div>
                    </div>
                ` : `
                    <div class="note-content markdown-content ${isExpanded ? '' : 'collapsed'}">
                        ${renderMarkdown(note.content)}
                    </div>
                    ${!isExpanded && hasManyLines ? `
                        <button class="expand-btn" onclick="toggleNoteExpansion(${note.id})" style="background: none; border: none; color: #3498db; cursor: pointer; padding: 5px 0; text-align: left;">
                            Показать полностью...
                        </button>
                    ` : ''}
                `}
                
                <div class="note-footer">
                    <div class="note-date">${note.date}</div>
                    ${isExpanded && hasManyLines ? `
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
// ЭКСПОРТ/ИМПОРТ
// ====================
function exportToJSON() {
    if (notes.length === 0) {
        alert('Нет заметок для экспорта');
        return;
    }
    
    const exportData = {
        notes: notes,
        categories: categories.filter(c => c.custom), // Экспортируем только пользовательские категории
        settings: {
            sortOrder: sortOrder,
            viewMode: viewMode
        },
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
                // Импортируем категории (только пользовательские)
                if (importData.categories && Array.isArray(importData.categories)) {
                    importData.categories.forEach(importedCat => {
                        if (!categories.some(cat => cat.id === importedCat.id)) {
                            // Помечаем импортированные категории как пользовательские
                            importedCat.custom = true;
                            categories.push(importedCat);
                        }
                    });
                    saveCategories();
                }
                
                // Импортируем заметки
                importData.notes.forEach(importedNote => {
                    // Обновляем ID чтобы избежать конфликтов
                    importedNote.id = Date.now() + Math.random();
                    // Для совместимости со старыми данными
                    importedNote.createdTimestamp = importedNote.createdTimestamp || importedNote.timestamp || Date.now();
                    importedNote.updatedTimestamp = importedNote.updatedTimestamp || Date.now();
                    
                    // Если категория заметки не существует, переносим в "Все"
                    if (!categories.some(cat => cat.id === importedNote.category)) {
                        importedNote.category = 'all';
                    }
                    
                    notes.unshift(importedNote);
                });
                
                // Импортируем настройки, если есть
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
        // Оставляем только категорию "Все" и примеры категорий
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
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
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
        
        // Показать полосу прокрутки при необходимости
        if (this.scrollHeight > 400) {
            this.style.overflowY = 'auto';
        }
    });
    
    // Инициализация
    autoResizeTextarea(textarea);
}

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    
    const newHeight = Math.min(textarea.scrollHeight, 400);
    textarea.style.height = newHeight + 'px';
    
    if (textarea.scrollHeight > 400) {
        textarea.style.overflowY = 'auto';
    } else {
        textarea.style.overflowY = 'hidden';
    }
}

// ====================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ====================
function setupEventListeners() {
    // Сохранение заметки
    document.getElementById('saveBtn').addEventListener('click', () => {
        const text = document.getElementById('noteInput').value;
        const categoryId = document.getElementById('noteCategory').value;
        addNote(text, categoryId);
    });
    
    // Сохранение по Enter (без Shift)
    document.getElementById('noteInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const categoryId = document.getElementById('noteCategory').value;
            addNote(this.value, categoryId);
        }
    });
    
    // Добавление категории
    document.getElementById('addCategoryBtn').addEventListener('click', () => {
        document.getElementById('categoryModal').classList.add('active');
    });
    
    // Создание категории в модальном окне
    document.getElementById('createCategoryBtn').addEventListener('click', () => {
        const name = document.getElementById('newCategoryName').value;
        const color = document.getElementById('newCategoryColor').value;
        createCategory(name, color);
    });
    
    // Управление категориями
    document.getElementById('editCategoriesBtn').addEventListener('click', () => {
        document.getElementById('categoryModal').classList.add('active');
    });
    
    // Закрытие модального окна
    document.querySelector('.close-modal').addEventListener('click', () => {
        document.getElementById('categoryModal').classList.remove('active');
    });
    
    // Закрытие модального окна при клике вне его
    document.getElementById('categoryModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('categoryModal')) {
            document.getElementById('categoryModal').classList.remove('active');
        }
    });
    
    // Фильтрация по категории
    document.getElementById('categoryFilter').addEventListener('change', function() {
        setActiveCategory(this.value);
    });
    
    // Очистка фильтра
    document.getElementById('clearFilterBtn').addEventListener('click', () => {
        setActiveCategory('all');
    });
    
    // Сортировка заметок
    document.getElementById('sortNewBtn').addEventListener('click', () => {
        setSortOrder('new');
    });
    
    document.getElementById('sortOldBtn').addEventListener('click', () => {
        setSortOrder('old');
    });
    
    // Переключение режима отображения
    document.getElementById('viewListBtn').addEventListener('click', () => {
        setViewMode('list');
    });
    
    document.getElementById('viewGridBtn').addEventListener('click', () => {
        setViewMode('grid');
    });
    
    // Экспорт/импорт
    document.getElementById('exportBtn').addEventListener('click', exportToJSON);
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', importFromJSON);
    
    // Очистка всех данных
    document.getElementById('clearAllBtn').addEventListener('click', clearAllData);
}

// ====================
// ЗАПУСК ПРИЛОЖЕНИЯ
// (это происходит автоматически при загрузке страницы)
// ====================
document.addEventListener('DOMContentLoaded', initApp);

// ====================
// ДОПОЛНИТЕЛЬНО: Функция для отладки
// ====================
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

// Для отладки в консоли можно вызвать debugInfo()