// ====================
// API модуль – все запросы к серверу
// ====================

const API_BASE = 'http://localhost:3000/api';

export async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error ${response.status}: ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`API request failed: ${endpoint}`, error);
        throw error;
    }
}

// ----- Заметки -----
export async function fetchNotes(sortOrder) {
    return apiRequest(`/notes?sort=${sortOrder}`);
}
export async function createNote(noteData) {
    return apiRequest('/notes', 'POST', noteData);
}
export async function updateNote(id, noteData) {
    return apiRequest(`/notes/${id}`, 'PUT', noteData);
}
export async function deleteNoteById(id) {
    return apiRequest(`/notes/${id}`, 'DELETE');
}

// ----- Категории -----
export async function fetchCategories() {
    const cats = await apiRequest('/categories');
    // Добавляем виртуальную категорию "Все заметки"
    if (!cats.some(c => c.id === 'all')) {
        cats.unshift({ id: 'all', name: 'Все заметки', color: '#7f8c8d', custom: false });
    }
    return cats;
}
export async function createCategory(catData) {
    return apiRequest('/categories', 'POST', catData);
}
export async function deleteCategoryById(id) {
    return apiRequest(`/categories/${id}`, 'DELETE');
}

// ----- Настройки -----
export async function fetchSettings() {
    return apiRequest('/settings');
}
export async function updateSettings(settingsData) {
    return apiRequest('/settings', 'PUT', settingsData);
}