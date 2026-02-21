// Простой блокнот - ОПТИМИЗИРОВАННАЯ ВЕРСИЯ С 2 РЕЖИМАМИ
class NotebookApp {
    constructor() {
        this.data = {
            lastId: 0,
            lastGroupId: 0,
            groups: [],
            items: []
        };
        
        this.selectedGroup = null;
        this.viewMode = 'list'; // 'list' (список) или 'grid' (превью)
        this.linkPreviewCache = new Map();
        this.fetchQueue = new Map();
        this.isFetching = false;
        this.itemsPerPage = 20;
        this.currentPage = 1;
        this.totalPages = 1;
        this.imageObserver = null;
        this.searchQuery = '';
        
        this.init();
    }
    
    init() {
        this.loadData();
        this.setupEventListeners();
        this.setupIntersectionObserver();
        this.render();
    }
    
    loadData() {
        const saved = localStorage.getItem('notebookData');
        if (saved) {
            try {
                const parsedData = JSON.parse(saved);
                
                // Загружаем настройки
                const settings = localStorage.getItem('notebookSettings');
                if (settings) {
                    const { viewMode } = JSON.parse(settings);
                    this.viewMode = viewMode || 'list';
                }
                
                // Миграция старых данных
                if (!parsedData.lastGroupId) {
                    parsedData.lastGroupId = parsedData.groups.length ? 
                        Math.max(...parsedData.groups.map(g => g.id)) : 0;
                }
                
                // Убедимся, что у всех items есть updated
                if (parsedData.items) {
                    parsedData.items.forEach(item => {
                        if (!item.updated) {
                            item.updated = item.created;
                        }
                        // Добавляем поле для хранения метаданных ссылок
                        if (item.type === 'link' && !item.metadata) {
                            item.metadata = null;
                        }
                    });
                }
                
                this.data = parsedData;
            } catch (e) {
                console.error('Ошибка загрузки данных:', e);
                this.setDefaultData();
            }
        } else {
            this.setDefaultData();
        }
    }
    
    saveSettings() {
        const settings = {
            viewMode: this.viewMode
        };
        localStorage.setItem('notebookSettings', JSON.stringify(settings));
    }
    
    saveData() {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                localStorage.setItem('notebookData', JSON.stringify(this.data));
            });
        } else {
            setTimeout(() => {
                localStorage.setItem('notebookData', JSON.stringify(this.data));
            }, 100);
        }
    }
    
    setDefaultData() {
        this.data = {
            lastId: 3,
            lastGroupId: 3,
            groups: [
                { id: 1, name: 'Покупки', color: '#4CAF50' },
                { id: 2, name: 'Статьи', color: '#2196F3' },
                { id: 3, name: 'Работа', color: '#FF9800' }
            ],
            items: [
                {
                    id: 1,
                    title: 'Лопата совковая',
                    content: 'https://www.ozon.ru/product/lopata-sovkovaya-relsovaya-stal-3425634607/',
                    groupId: 1,
                    type: 'link',
                    created: '2024-01-15T10:30:00',
                    updated: '2024-01-15T10:30:00',
                    metadata: null
                },
                {
                    id: 2,
                    title: 'Рецепт круассанов',
                    content: 'Для приготовления круассанов нужны: слоеное тесто, масло, сахар.',
                    groupId: 3,
                    type: 'note',
                    created: '2024-01-14T14:45:00',
                    updated: '2024-01-14T14:45:00'
                },
                {
                    id: 3,
                    title: 'Идеи для проекта',
                    content: 'Создать приложение для учета финансов.',
                    groupId: 3,
                    type: 'note',
                    created: '2024-01-13T09:15:00',
                    updated: '2024-01-13T09:15:00'
                }
            ]
        };
        this.saveData();
    }
    
    setupEventListeners() {
        document.getElementById('addNoteBtn').addEventListener('click', () => this.addNote());
        document.getElementById('addGroupBtn').addEventListener('click', () => this.addGroup());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportData());
        document.getElementById('importInput').addEventListener('change', (e) => this.importData(e));
        
        // Переключение режимов
        document.getElementById('viewListBtn').addEventListener('click', () => this.setViewMode('list'));
        document.getElementById('viewGridBtn').addEventListener('click', () => this.setViewMode('grid'));
        
        // Пагинация
        document.getElementById('loadMoreBtn').addEventListener('click', () => this.loadMoreNotes());
        
        // Поиск
        document.getElementById('searchInput').addEventListener('input', (e) => this.searchNotes(e.target.value));
        
        // Быстрые клавиши
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                document.getElementById('searchInput').focus();
            }
            if (e.ctrlKey && e.key === '1') {
                e.preventDefault();
                this.setViewMode('list');
            }
            if (e.ctrlKey && e.key === '2') {
                e.preventDefault();
                this.setViewMode('grid');
            }
        });
        
        // Обработка Enter в форме
        document.getElementById('noteTitle').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('noteContent').focus();
            }
        });
        
        document.getElementById('noteContent').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                this.addNote();
            }
        });
        
        document.getElementById('newGroupInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addGroup();
            }
        });
    }
    
    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.dataset.src;
                        if (src) {
                            img.src = src;
                            img.removeAttribute('data-src');
                        }
                        this.imageObserver.unobserve(img);
                    }
                });
            }, {
                rootMargin: '50px',
                threshold: 0.1
            });
        }
    }
    
    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
    
    isValidURL(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }
    
    getDomainFromUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        } catch (e) {
            return url;
        }
    }
    
    getFaviconUrl(url) {
        try {
            const urlObj = new URL(url);
            return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
        } catch (e) {
            return '';
        }
    }
    
    getShortDescription(metadata) {
        if (!metadata || !metadata.description) return '';
        const desc = metadata.description.trim();
        if (desc.length <= 100) return desc;
        return desc.substring(0, 100) + '...';
    }
    
    getShortTitle(title) {
        if (title.length <= 50) return title;
        return title.substring(0, 47) + '...';
    }
    
    async fetchLinkMetadata(url) {
        if (this.linkPreviewCache.has(url)) {
            return this.linkPreviewCache.get(url);
        }
        
        if (this.fetchQueue.has(url) || this.isFetching) {
            this.fetchQueue.set(url, null);
            return null;
        }
        
        this.fetchQueue.set(url, null);
        return this.processNextInQueue();
    }
    
    async processNextInQueue() {
        if (this.isFetching || this.fetchQueue.size === 0) return;
        
        this.isFetching = true;
        const [url, _] = Array.from(this.fetchQueue.entries())[0];
        
        try {
            const encodedUrl = encodeURIComponent(url);
            const apiUrl = `https://api.microlink.io/?url=${encodedUrl}&audio=false&video=false&iframe=false`;
            
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            const metadata = {
                title: data.data.title || '',
                description: data.data.description || '',
                image: data.data.image?.url || data.data.logo?.url || '',
                siteName: data.data.publisher || this.getDomainFromUrl(url)
            };
            
            metadata.title = metadata.title.trim().substring(0, 200);
            metadata.description = metadata.description.trim().substring(0, 300);
            
            this.linkPreviewCache.set(url, metadata);
            
            const note = this.data.items.find(item => item.content === url);
            if (note) {
                note.metadata = metadata;
                this.saveData();
                
                requestAnimationFrame(() => {
                    this.updateNoteInDOM(note.id, metadata);
                });
            }
            
            return metadata;
            
        } catch (error) {
            console.error('Ошибка получения метаданных:', error);
            
            // Пробуем альтернативный способ получения превью
            const fallbackMetadata = {
                title: '',
                description: '',
                image: '',
                siteName: this.getDomainFromUrl(url)
            };
            
            this.linkPreviewCache.set(url, fallbackMetadata);
            return fallbackMetadata;
            
        } finally {
            this.fetchQueue.delete(url);
            this.isFetching = false;
            
            if (this.fetchQueue.size > 0) {
                setTimeout(() => this.processNextInQueue(), 1000);
            }
        }
    }
    
    updateNoteInDOM(noteId, metadata) {
        const noteElement = document.querySelector(`.note-card[data-id="${noteId}"]`);
        if (!noteElement) return;
        
        if (this.viewMode === 'list') {
            // Обновляем в режиме списка
            const descriptionEl = noteElement.querySelector('.link-description');
            if (descriptionEl && metadata.description) {
                descriptionEl.textContent = this.getShortDescription(metadata);
            }
            
            const titleEl = noteElement.querySelector('.note-title-text');
            if (titleEl && metadata.title) {
                titleEl.textContent = metadata.title;
            }
        } else {
            // Обновляем в режиме превью
            const note = this.data.items.find(n => n.id === noteId);
            const contentEl = noteElement.querySelector('.note-content');
            if (contentEl && note && note.type === 'link') {
                const newContent = this.renderLinkContent(note, metadata, true);
                contentEl.innerHTML = newContent;
            }
        }
    }
    
    // Рендеринг содержимого ссылки в зависимости от режима
    renderLinkContent(note, metadata, forceUpdate = false) {
        const domain = this.getDomainFromUrl(note.content);
        const faviconUrl = this.getFaviconUrl(note.content);
        
        if (this.viewMode === 'list') {
            // Режим списка - УПРОЩЕННЫЙ ВИД (без превью фото)
            const faviconHTML = faviconUrl ? 
                `<img src="${faviconUrl}" alt="favicon" class="link-favicon" loading="lazy">` : 
                '<i class="fas fa-link link-icon"></i>';
            
            const description = metadata ? this.getShortDescription(metadata) : '';
            
            return `
                <div class="link-list-item">
                    <div class="link-list-header">
                        <div class="link-favicon-container">
                            ${faviconHTML}
                        </div>
                        <div class="link-info">
                            <a href="${note.content}" target="_blank" rel="noopener noreferrer" class="link-url">
                                ${this.escapeHTML(this.getShortTitle(metadata?.title || note.title))}
                            </a>
                            <div class="link-domain">${this.escapeHTML(domain)}</div>
                        </div>
                    </div>
                    ${description ? `<div class="link-description">${this.escapeHTML(description)}</div>` : ''}
                </div>
            `;
        } else {
            // Режим превью - с изображением
            let previewHTML = '<div class="link-preview">';
            
            if (metadata && metadata.image) {
                previewHTML += `
                    <img src="${metadata.image}" 
                         alt="${metadata.title || domain}" 
                         class="link-preview-image"
                         loading="lazy"
                         onerror="this.style.display='none'">
                `;
            }
            
            previewHTML += `
                <div class="link-preview-info">
            `;
            
            if (metadata && metadata.title) {
                previewHTML += `
                    <div class="link-preview-title">${this.escapeHTML(metadata.title)}</div>
                `;
            }
            
            if (metadata && metadata.description) {
                previewHTML += `
                    <div class="link-preview-description">${this.escapeHTML(metadata.description)}</div>
                `;
            }
            
            previewHTML += `
                    <a href="${note.content}" target="_blank" rel="noopener noreferrer" class="link-preview-url">
            `;
            
            if (faviconUrl) {
                previewHTML += `<img src="${faviconUrl}" alt="favicon" class="link-preview-favicon" loading="lazy">`;
            }
            
            previewHTML += `
                        <span class="link-preview-domain">${this.escapeHTML(domain)}</span>
                    </a>
                </div>
            </div>
            `;
            
            return previewHTML;
        }
    }
    
    // Рендеринг содержимого текстовой заметки
    renderNoteContent(content) {
        const escapedContent = this.escapeHTML(content);
        const isLongText = content.length > 150;
        
        if (isLongText) {
            return `
                <div class="note-text expandable">
                    ${escapedContent}
                    <button class="expand-toggle">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
            `;
        } else {
            return `<div class="note-text">${escapedContent}</div>`;
        }
    }
    
    // Установка обработчиков для раскрытия/сворачивания текста
    setupExpandableNote(noteElement, content) {
        const noteContent = noteElement.querySelector('.note-text.expandable');
        if (!noteContent) return;
        
        const expandBtn = noteContent.querySelector('.expand-toggle');
        if (!expandBtn) return;
        
        // Обработчик клика по кнопке
        expandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            noteContent.classList.toggle('expanded');
            if (noteContent.classList.contains('expanded')) {
                expandBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
            } else {
                expandBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
            }
        });
        
        // Обработчик клика по всему тексту
        noteContent.addEventListener('click', (e) => {
            if (e.target.className !== 'expand-toggle' && !e.target.closest('.expand-toggle')) {
                noteContent.classList.toggle('expanded');
                const expandBtn = noteContent.querySelector('.expand-toggle');
                if (expandBtn) {
                    if (noteContent.classList.contains('expanded')) {
                        expandBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
                    } else {
                        expandBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
                    }
                }
            }
        });
    }
    
    setViewMode(mode) {
        this.viewMode = mode;
        this.saveSettings();
        
        // Обновляем активные кнопки
        document.querySelectorAll('.view-toggle').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });
        
        // Обновляем класс контейнера
        const notesList = document.getElementById('notesList');
        notesList.className = `notes-list ${mode}-view`;
        
        // Обновляем иконку в заголовке
        const viewIcon = document.getElementById('viewModeIcon');
        if (viewIcon) {
            viewIcon.className = mode === 'list' ? 'fas fa-list' : 'fas fa-th-large';
        }
        
        // Перерисовываем заметки
        this.currentPage = 1;
        this.renderNotes();
    }
    
    searchNotes(query) {
        this.searchQuery = query.toLowerCase().trim();
        this.currentPage = 1;
        this.renderNotes();
    }
    
    getFilteredNotes() {
        let filteredNotes = [...this.data.items];
        
        if (this.selectedGroup !== null) {
            filteredNotes = filteredNotes.filter(item => item.groupId === this.selectedGroup);
        }
        
        if (this.searchQuery) {
            filteredNotes = filteredNotes.filter(item => 
                item.title.toLowerCase().includes(this.searchQuery) ||
                item.content.toLowerCase().includes(this.searchQuery) ||
                (item.metadata?.description?.toLowerCase() || '').includes(this.searchQuery) ||
                (item.metadata?.title?.toLowerCase() || '').includes(this.searchQuery)
            );
        }
        
        // Сортируем по дате (новые сверху)
        filteredNotes.sort((a, b) => new Date(b.updated || b.created) - new Date(a.updated || a.created));
        
        return filteredNotes;
    }
    
    getNotesForCurrentPage() {
        const filteredNotes = this.getFilteredNotes();
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return filteredNotes.slice(startIndex, endIndex);
    }
    
    loadMoreNotes() {
        this.currentPage++;
        this.renderNotes();
    }
    
    addNote() {
        const title = document.getElementById('noteTitle').value.trim();
        let content = document.getElementById('noteContent').value.trim();
        const groupId = parseInt(document.getElementById('noteGroup').value);
        
        if (!title || !content || !groupId) {
            alert('Заполните все поля!');
            return;
        }
        
        let type = 'note';
        if (content.startsWith('http')) {
            if (!this.isValidURL(content)) {
                alert('Введите корректную ссылку (начинается с http:// или https://)');
                return;
            }
            type = 'link';
        }
        
        const newNote = {
            id: ++this.data.lastId,
            title: this.escapeHTML(title),
            content: type === 'link' ? content : content, // Не экранируем тут, экранируем при рендеринге
            groupId,
            type,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            metadata: type === 'link' ? null : undefined
        };
        
        this.data.items.unshift(newNote);
        this.saveData();
        
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteContent').value = '';
        
        this.currentPage = 1;
        this.render();
        
        if (type === 'link') {
            setTimeout(() => this.fetchLinkMetadata(content), 500);
        }
    }
    
    addGroup() {
        const input = document.getElementById('newGroupInput');
        const name = input.value.trim();
        
        if (!name) {
            alert('Введите название группы');
            return;
        }
        
        if (this.data.groups.some(g => g.name.toLowerCase() === name.toLowerCase())) {
            alert('Такая группа уже есть!');
            return;
        }
        
        const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336'];
        const color = colors[this.data.groups.length % colors.length];
        
        const newGroup = {
            id: ++this.data.lastGroupId,
            name: this.escapeHTML(name),
            color
        };
        
        this.data.groups.push(newGroup);
        this.saveData();
        
        input.value = '';
        this.renderGroups();
    }
    
    selectGroup(groupId) {
        this.selectedGroup = groupId;
        this.currentPage = 1;
        this.renderNotes();
    }
    
    deleteNote(id) {
        if (confirm('Удалить заметку?')) {
            this.data.items = this.data.items.filter(item => item.id !== id);
            this.saveData();
            
            const filteredNotes = this.getFilteredNotes();
            const notesOnPage = this.getNotesForCurrentPage();
            
            if (notesOnPage.length === 0 && this.currentPage > 1) {
                this.currentPage--;
            }
            
            this.render();
        }
    }
    
    editNote(id) {
        const note = this.data.items.find(item => item.id === id);
        if (!note) return;
        
        const newTitle = prompt('Новое название:', note.title);
        if (newTitle === null) return;
        
        const newContent = prompt('Новый текст:', note.content);
        if (newContent === null) return;
        
        note.title = this.escapeHTML(newTitle.trim());
        
        const wasLink = note.type === 'link';
        const isNowLink = newContent.trim().startsWith('http');
        
        if (isNowLink) {
            if (!this.isValidURL(newContent.trim())) {
                alert('Введите корректную ссылку (начинается с http:// или https://)');
                return;
            }
            note.type = 'link';
            note.content = newContent.trim();
            note.metadata = null;
        } else {
            note.type = 'note';
            note.content = newContent.trim(); // Сохраняем без экранирования
            delete note.metadata;
        }
        
        note.updated = new Date().toISOString();
        
        this.saveData();
        this.renderNotes();
        
        if (isNowLink && (!wasLink || note.content !== newContent.trim())) {
            setTimeout(() => this.fetchLinkMetadata(note.content), 500);
        }
    }
    
    renderGroups() {
        const groupsList = document.getElementById('groupsList');
        const groupSelect = document.getElementById('noteGroup');
        
        groupsList.innerHTML = '';
        groupSelect.innerHTML = '<option value="">Выберите группу</option>';
        
        // "Все группы"
        const allItem = document.createElement('div');
        allItem.className = 'group-item' + (this.selectedGroup === null ? ' active' : '');
        allItem.innerHTML = `
            <span class="group-name">Все группы</span>
            <span class="group-count">${this.data.items.length}</span>
        `;
        allItem.addEventListener('click', () => this.selectGroup(null));
        groupsList.appendChild(allItem);
        
        // Остальные группы
        this.data.groups.forEach(group => {
            const count = this.data.items.filter(item => item.groupId === group.id).length;
            
            const groupEl = document.createElement('div');
            groupEl.className = 'group-item' + (this.selectedGroup === group.id ? ' active' : '');
            groupEl.innerHTML = `
                <div class="group-info">
                    <span class="group-color" style="background-color: ${group.color}"></span>
                    <span class="group-name">${group.name}</span>
                </div>
                <span class="group-count">${count}</span>
            `;
            groupEl.addEventListener('click', () => this.selectGroup(group.id));
            groupsList.appendChild(groupEl);
            
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name;
            groupSelect.appendChild(option);
        });
    }
    
    renderNotes() {
        const notesList = document.getElementById('notesList');
        const notesCount = document.getElementById('notesCount');
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        const paginationInfo = document.getElementById('paginationInfo');
        
        const filteredNotes = this.getFilteredNotes();
        const paginatedNotes = this.getNotesForCurrentPage();
        
        this.totalPages = Math.ceil(filteredNotes.length / this.itemsPerPage);
        
        notesCount.textContent = filteredNotes.length;
        
        if (paginationInfo) {
            paginationInfo.textContent = `Страница ${this.currentPage} из ${this.totalPages}`;
        }
        
        if (loadMoreBtn) {
            loadMoreBtn.style.display = this.currentPage < this.totalPages ? 'block' : 'none';
        }
        
        // Если это первая страница, очищаем список
        if (this.currentPage === 1) {
            notesList.innerHTML = '';
        }
        
        if (paginatedNotes.length === 0 && this.currentPage === 1) {
            notesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard fa-3x"></i>
                    <p>${this.searchQuery ? 'Ничего не найдено' : 'Нет заметок'}</p>
                </div>
            `;
            return;
        }
        
        const fragment = document.createDocumentFragment();
        
        paginatedNotes.forEach(note => {
            const group = this.data.groups.find(g => g.id === note.groupId);
            const groupColor = group ? group.color : '#4CAF50';
            const groupName = group ? group.name : 'Без группы';
            
            const noteEl = document.createElement('div');
            noteEl.className = 'note-card';
            noteEl.setAttribute('data-id', note.id);
            
            // Шапка заметки
            noteEl.innerHTML = `
                <div class="note-header">
                    <div class="note-title">
                        <i class="${note.type === 'link' ? 'fas fa-link note-icon' : 'fas fa-sticky-note note-icon'}"></i>
                        <span class="note-title-text">${this.escapeHTML(note.title)}</span>
                    </div>
                    <div class="note-actions">
                        <button class="btn-small edit-note" data-id="${note.id}" title="Редактировать">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-small delete-note" data-id="${note.id}" title="Удалить">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="note-content">
                    ${note.type === 'link' ? 
                        this.renderLinkContent(note, note.metadata) : 
                        this.renderNoteContent(note.content)
                    }
                </div>
                <div class="note-footer">
                    <span class="note-group" style="background-color: ${groupColor + '22'}; color: ${groupColor}">
                        ${groupName}
                    </span>
                    <span class="note-date">${this.formatDate(note.updated || note.created)}</span>
                </div>
            `;
            
            // Обработчики для кнопок действий
            noteEl.querySelector('.edit-note').addEventListener('click', (e) => {
                this.editNote(parseInt(e.currentTarget.dataset.id));
            });
            
            noteEl.querySelector('.delete-note').addEventListener('click', (e) => {
                this.deleteNote(parseInt(e.currentTarget.dataset.id));
            });
            
            // Настройка раскрытия/сворачивания для текстовых заметок
            if (note.type === 'note') {
                this.setupExpandableNote(noteEl, note.content);
            }
            
            fragment.appendChild(noteEl);
        });
        
        notesList.appendChild(fragment);
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        
        if (diff === 0) return 'Сегодня';
        if (diff === 1) return 'Вчера';
        if (diff < 7) return `${diff} дн. назад`;
        
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }
    
    render() {
        requestAnimationFrame(() => {
            this.renderGroups();
            this.renderNotes();
        });
    }
    
    exportData() {
        const dataStr = JSON.stringify(this.data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `notebook-backup-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }
    
    importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                if (!importedData.groups || !Array.isArray(importedData.groups) ||
                    !importedData.items || !Array.isArray(importedData.items)) {
                    alert('Неверный формат файла. Файл должен содержать массивы groups и items.');
                    return;
                }
                
                const replace = confirm(`Импортировать данные?\n\nГруппы: ${importedData.groups.length}\nЗаметки: ${importedData.items.length}\n\nЗаменить текущие данные? (ОК - заменить, Отмена - добавить)`);
                
                if (replace) {
                    this.data = {
                        lastId: importedData.lastId || 0,
                        lastGroupId: importedData.lastGroupId || 0,
                        groups: importedData.groups,
                        items: importedData.items
                    };
                } else {
                    const maxItemId = Math.max(...this.data.items.map(i => i.id), 0);
                    const maxGroupId = Math.max(...this.data.groups.map(g => g.id), 0);
                    
                    const groupIdMap = {};
                    importedData.groups.forEach(group => {
                        const oldId = group.id;
                        group.id = maxGroupId + group.id;
                        groupIdMap[oldId] = group.id;
                    });
                    
                    importedData.items.forEach(item => {
                        item.id = maxItemId + item.id;
                        if (groupIdMap[item.groupId]) {
                            item.groupId = groupIdMap[item.groupId];
                        }
                    });
                    
                    this.data.groups.push(...importedData.groups);
                    this.data.items.push(...importedData.items);
                    
                    this.data.lastId = Math.max(...this.data.items.map(i => i.id));
                    this.data.lastGroupId = Math.max(...this.data.groups.map(g => g.id));
                }
                
                this.data.items.forEach(item => {
                    if (!item.updated) {
                        item.updated = item.created || new Date().toISOString();
                    }
                    if (item.type === 'link' && !item.metadata) {
                        item.metadata = null;
                    }
                });
                
                this.saveData();
                this.currentPage = 1;
                this.render();
                alert('Данные успешно импортированы!');
                
                event.target.value = '';
                
                // Медленная загрузка метаданных
                setTimeout(() => {
                    this.loadMetadataForNewLinks();
                }, 2000);
                
            } catch (error) {
                alert('Ошибка импорта: ' + error.message);
                console.error('Import error:', error);
            }
        };
        reader.onerror = () => {
            alert('Ошибка чтения файла');
        };
        reader.readAsText(file);
    }
    
    loadMetadataForNewLinks() {
        const linksWithoutMetadata = this.data.items
            .filter(item => item.type === 'link' && !item.metadata)
            .slice(0, 5);
        
        linksWithoutMetadata.forEach((item, index) => {
            setTimeout(() => {
                this.fetchLinkMetadata(item.content);
            }, index * 2000);
        });
    }
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    window.app = new NotebookApp();
});