// ====================
// MARKDOWN ФУНКЦИИ
// ====================

marked.setOptions({ breaks: true, gfm: true, headerIds: false });

export function containsMarkdown(text) {
    const markdownPatterns = [
        /^#+\s/m, /\*\*.*\*\*/, /\*.*\*/, /^> /m, /^-\s/m, /^\d+\.\s/m,
        /`[^`]+`/, /^```[\s\S]*?^```/m, /\[.*\]\(.*\)/, /!\[.*\]\(.*\)/,
        /^\|.*\|$/m, /^---/m, /~~.*~~/
    ];
    return markdownPatterns.some(pattern => pattern.test(text));
}

export function renderMarkdown(text) {
    if (!containsMarkdown(text)) return text.replace(/\n/g, '<br>');
    try {
        return marked.parse(text);
    } catch (error) {
        console.error('Ошибка парсинга Markdown:', error);
        return text.replace(/\n/g, '<br>');
    }
}

export function insertMarkdown(button, type) {
    const noteEdit = button.closest('.note-edit');
    const textarea = noteEdit.querySelector('.edit-textarea');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    let insertText = '';
    switch (type) {
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

export function toggleMarkdownPreview(button, noteId) {
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

export function showMarkdownHelp() {
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
            <button class="close-help">Закрыть</button>
        `;
        help.querySelector('.close-help').addEventListener('click', () => help.remove());
        document.body.appendChild(help);
    }
    help.classList.add('active');
}

export function createMarkdownToolbarHtml() {
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

window.insertMarkdown = insertMarkdown;
window.showMarkdownHelp = showMarkdownHelp;