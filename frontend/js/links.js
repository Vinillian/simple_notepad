import { state } from './main.js';
import { updateNote } from './api.js';

export function isValidURL(string) {
    try { const url = new URL(string); return url.protocol === 'http:' || url.protocol === 'https:'; } catch (_) { return false; }
}

export function getDomainFromUrl(url) {
    try { const urlObj = new URL(url); return urlObj.hostname.replace('www.', ''); } catch (e) { return url; }
}

export function getFaviconUrl(url) {
    try { const urlObj = new URL(url); return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`; } catch (e) { return ''; }
}

function getShortDescription(metadata) {
    if (!metadata?.description) return '';
    const desc = metadata.description.trim();
    return desc.length <= 100 ? desc : desc.substring(0, 100) + '...';
}

function getShortTitle(title) {
    if (!title) return '';
    return title.length <= 50 ? title : title.substring(0, 47) + '...';
}

export async function fetchLinkMetadata(noteId, url) {
    if (state.linkPreviewCache.has(url)) {
        const metadata = state.linkPreviewCache.get(url);
        await updateNoteMetadata(noteId, metadata);
        return;
    }
    if (state.fetchQueue.has(url) || state.isFetching) {
        state.fetchQueue.set(url, noteId);
        return;
    }
    state.fetchQueue.set(url, noteId);
    await processNextInQueue();
}

async function processNextInQueue() {
    if (state.isFetching || state.fetchQueue.size === 0) return;
    state.isFetching = true;
    const [url, noteId] = Array.from(state.fetchQueue.entries())[0];
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
        state.linkPreviewCache.set(url, metadata);
        await updateNoteMetadata(noteId, metadata);
    } catch (error) {
        console.error('Ошибка получения метаданных:', error);
        const fallbackMetadata = { title: '', description: '', image: '', siteName: getDomainFromUrl(url) };
        state.linkPreviewCache.set(url, fallbackMetadata);
        await updateNoteMetadata(noteId, fallbackMetadata);
    } finally {
        state.fetchQueue.delete(url);
        state.isFetching = false;
        if (state.fetchQueue.size > 0) setTimeout(() => processNextInQueue(), 1000);
    }
}

async function updateNoteMetadata(noteId, metadata) {
    const note = state.allNotes.find(n => n.id === noteId);
    if (note) {
        note.metadata = metadata;
        if (note.type === 'link' && !note.title && metadata.title) {
            note.title = getShortTitle(metadata.title);
        }
        try {
            await updateNote(note.id, note);
        } catch (error) {
            console.error('Не удалось обновить метаданные на сервере', error);
        }
        import('./ui.js').then(module => module.displayNotes(state));
    }
}

export function renderLinkContent(note) {
    const url = note.content.trim();
    const domain = getDomainFromUrl(url);
    const faviconUrl = getFaviconUrl(url);
    const metadata = note.metadata || {};

    if (state.viewMode === 'list') {
        // Компактный вид для списка
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
    } else {
        // Режим превью – с изображением
        let html = '<div class="link-preview">';
        if (metadata.image) {
            html += `<img src="${metadata.image}" class="link-preview-image" alt="Preview" loading="lazy" onerror="this.style.display='none'">`;
        }
        html += '<div class="link-preview-info">';
        if (metadata.title) {
            html += `<div class="link-preview-title">${escapeHTML(metadata.title)}</div>`;
        }
        if (metadata.description) {
            html += `<div class="link-preview-description">${escapeHTML(metadata.description)}</div>`;
        }
        html += `<a href="${url}" target="_blank" rel="noopener noreferrer" class="link-preview-url">`;
        if (faviconUrl) {
            html += `<img src="${faviconUrl}" class="link-preview-favicon" alt="">`;
        }
        html += `<span>${escapeHTML(domain)}</span>`;
        html += '</a></div></div>';
        return html;
    }
}

function escapeHTML(str) {
    return str.replace(/[&<>"]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return m;
    });
}