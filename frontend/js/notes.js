import { state } from './main.js';
import { createNote, updateNote, deleteNoteById } from './api.js';
import { isValidURL, getDomainFromUrl, fetchLinkMetadata } from './links.js';

export function filterNotesByCategory(state) {
    if (state.activeCategory === 'all') {
        state.notes = [...state.allNotes];
    } else {
        state.notes = state.allNotes.filter(note => note.category_id === state.activeCategory);
    }
}

export async function addNote(title, text, categoryId) {
    if (!text?.trim()) { alert('Введите текст заметки!'); return; }
    if (!categoryId || categoryId === '') { alert('Выберите категорию!'); return; }
    if (categoryId === 'all') { alert('Нельзя создать заметку в категории "Все заметки"!'); return; }

    const trimmedText = text.trim();
    const isLink = isValidURL(trimmedText) && trimmedText.split('\n').length === 1;

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
        category_id: categoryId,
        date: new Date().toLocaleString('ru-RU', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }),
        created_timestamp: now,
        updated_timestamp: now,
        expanded: false,
        edit_mode: false,
        type: isLink ? 'link' : 'note',
        metadata: isLink ? null : undefined
    };

    try {
        await createNote(newNote);
        state.allNotes.unshift(newNote);
        filterNotesByCategory(state);
        
        const { displayNotes } = await import('./ui.js');
        displayNotes(state);
        
        const { updateCategoriesUI } = await import('./categories.js');
        await updateCategoriesUI(state);

        document.getElementById('noteTitle').value = '';
        document.getElementById('noteInput').value = '';
        document.getElementById('charCount').textContent = '0';
        
        const { autoResizeTextarea } = await import('./utils.js');
        autoResizeTextarea(document.getElementById('noteInput'));

        if (isLink) {
            setTimeout(() => fetchLinkMetadata(newNote.id, trimmedText), 500);
        }
    } catch (error) {
        alert('Ошибка при сохранении заметки');
    }
}

export async function deleteNote(id) {
    if (confirm('Удалить эту заметку?')) {
        try {
            await deleteNoteById(id);
            state.allNotes = state.allNotes.filter(note => note.id !== id);
            filterNotesByCategory(state);
            
            const { displayNotes } = await import('./ui.js');
            displayNotes(state);
            
            const { updateCategoriesUI } = await import('./categories.js');
            await updateCategoriesUI(state);
        } catch (error) {
            alert('Ошибка при удалении заметки');
        }
    }
}

export async function saveEditedNote(id, newTitle, newContent) {
    const note = state.allNotes.find(n => n.id === id);
    if (!note) return;
    
    if (!newContent?.trim()) { alert('Текст не может быть пустым!'); return; }

    const trimmed = newContent.trim();
    const wasLink = note.type === 'link';
    const isNowLink = isValidURL(trimmed) && trimmed.split('\n').length === 1;

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
    note.updated_timestamp = Date.now();
    note.edit_mode = false;
    state.editingNoteId = null;

    if (isNowLink) {
        note.type = 'link';
        if (!note.metadata) note.metadata = null;
    } else {
        note.type = 'note';
        delete note.metadata;
    }

    try {
        await updateNote(id, note);
        filterNotesByCategory(state);
        
        const { displayNotes } = await import('./ui.js');
        displayNotes(state);
        
        const { updateCategoriesUI } = await import('./categories.js');
        await updateCategoriesUI(state);

        if (isNowLink && (!wasLink || note.content !== trimmed)) {
            setTimeout(() => fetchLinkMetadata(note.id, note.content), 500);
        }
    } catch (error) {
        alert('Ошибка при сохранении изменений');
    }
}

export function editNote(id) {
    const note = state.allNotes.find(n => n.id === id);
    if (!note) return;

    state.allNotes.forEach(n => n.edit_mode = false);
    note.edit_mode = true;
    state.editingNoteId = id;
    
    filterNotesByCategory(state);
    import('./ui.js').then(module => module.displayNotes(state));
}

export function cancelEditNote(id) {
    const note = state.allNotes.find(n => n.id === id);
    if (!note) return;
    
    note.edit_mode = false;
    state.editingNoteId = null;
    
    filterNotesByCategory(state);
    import('./ui.js').then(module => module.displayNotes(state));
}

export function toggleNoteExpansion(id) {
    const note = state.allNotes.find(n => n.id === id);
    if (!note) return;
    
    note.expanded = !note.expanded;
    filterNotesByCategory(state);
    import('./ui.js').then(module => module.displayNotes(state));
}