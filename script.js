const STORAGE_KEY = "raven-rp-demo-notes";
const FLOOD_COOLDOWN_MS = 4000;
const SAFE_ATTACHMENT_SIZE = 25 * 1024 * 1024;

const chatConfig = {
    notes: {
        label: "Личные заметки",
        title: "Заметки Ravenkeeper",
        description: "Приватный чат с собой для идей, черновиков постов и ссылок.",
        notice: "Заметки видны только владельцу аккаунта и сохраняются в этом браузере.",
        theme: "notes",
        rule: "Заметки приватны. В production их нужно шифровать на сервере или хотя бы строго ограничить доступ владельцем.",
        maxLength: 2000
    },
    game: {
        label: "Игровой чат",
        title: "Серый город",
        description: "Приватная игра для 4 участников. Перед первым входом указывается персонаж.",
        notice: "Игровые сообщения отправляются от имени персонажа. Если персонаж выходит, его старые посты становятся серыми.",
        theme: "game",
        rule: "В игре лимит символов не задан, но файлы ограничиваются безопасным размером.",
        maxLength: null
    },
    flood: {
        label: "Флудовый чат",
        title: "Комната игроков",
        description: "Приватная группа от 3 участников. Сообщения пишутся от аккаунта, не от персонажа.",
        notice: "Флуд ограничен 800 символами и тайм-аутом 4 секунды между отправками.",
        theme: "flood",
        rule: "Флуд: до 800 символов, cooldown 4 секунды. Блокировка работает в обе стороны.",
        maxLength: 800
    }
};

const state = {
    activeChat: "game",
    blocked: false,
    lastFloodSentAt: 0,
    selectedAttachment: null,
    messages: [
        {
            id: "g1",
            chat: "game",
            author: "Аделаида Кроу",
            avatar: "https://api.dicebear.com/8.x/adventurer/svg?seed=Adelaide",
            role: "character",
            text: "Дождь делал вывески похожими на расплывшиеся пророчества. **Аделаида** остановилась у закрытой аптеки и посмотрела на часы.",
            time: "21:04",
            exited: false,
            own: false
        },
        {
            id: "g2",
            chat: "game",
            author: "Илья Штольц",
            avatar: "https://api.dicebear.com/8.x/adventurer/svg?seed=Ilya",
            role: "character",
            text: "++Я видел этот знак раньше++, но тогда рядом был не ворон, а человек в сером пальто.",
            time: "21:07",
            exited: true,
            own: false
        },
        {
            id: "g3",
            chat: "game",
            author: "Мира Воронова",
            avatar: "https://api.dicebear.com/8.x/adventurer/svg?seed=Mira",
            role: "character",
            text: "Мира вытащила из кармана мокрую записку. *Чернила еще не успели расплыться.*",
            time: "21:09",
            exited: false,
            own: true
        },
        {
            id: "f1",
            chat: "flood",
            author: "🌙 Ravenkeeper",
            avatar: "https://api.dicebear.com/8.x/adventurer/svg?seed=Raven",
            role: "account",
            text: "Я завтра допишу сцену в аптеке. Если нужно, могу добавить отдельный offtop-тред по уликам.",
            time: "10:12",
            exited: false,
            own: true
        },
        {
            id: "f2",
            chat: "flood",
            author: "Mira",
            avatar: "https://api.dicebear.com/8.x/adventurer/svg?seed=PlayerMira",
            role: "account",
            text: "Да, offtop-сноски очень нужны, иначе обсуждение теряется между постами.",
            time: "10:14",
            exited: true,
            own: false
        }
    ]
};

const elements = {
    app: document.querySelector(".chat-app"),
    tabs: document.querySelectorAll(".chat-tab"),
    typeLabel: document.getElementById("chat-type-label"),
    title: document.getElementById("chat-title"),
    description: document.getElementById("chat-description"),
    notice: document.getElementById("chat-notice"),
    characterPanel: document.getElementById("character-panel"),
    characterName: document.getElementById("character-name"),
    characterAvatar: document.getElementById("character-avatar"),
    messages: document.getElementById("messages"),
    composer: document.getElementById("composer"),
    input: document.getElementById("message-input"),
    composerRule: document.getElementById("composer-rule"),
    attachment: document.getElementById("attachment"),
    exportChat: document.getElementById("export-chat"),
    blockUser: document.getElementById("block-user"),
    profileDescription: document.getElementById("profile-description"),
    profileCount: document.getElementById("profile-count"),
    addPlayer: document.getElementById("add-player"),
    userSearch: document.getElementById("user-search")
};

function loadNotes() {
    try {
        const savedNotes = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        savedNotes.forEach((note) => {
            state.messages.push({
                ...note,
                chat: "notes",
                role: "account",
                own: true,
                exited: false
            });
        });
    } catch {
        localStorage.removeItem(STORAGE_KEY);
    }
}

function saveNotes() {
    const notes = state.messages.filter((message) => message.chat === "notes");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderFormattedText(value) {
    return escapeHtml(value)
        .replace(/\*\*(.+?)\*\*/gs, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/gs, "<em>$1</em>")
        .replace(/\+\+(.+?)\+\+/gs, "<u>$1</u>")
        .replace(/~~(.+?)~~/gs, "<s>$1</s>");
}

function getCurrentTime() {
    return new Intl.DateTimeFormat("ru-RU", {
        hour: "2-digit",
        minute: "2-digit"
    }).format(new Date());
}

function currentAuthor() {
    if (state.activeChat === "game") {
        return {
            name: elements.characterName.value.trim() || "Новый персонаж",
            avatar: elements.characterAvatar.value.trim() || "https://api.dicebear.com/8.x/adventurer/svg?seed=NewCharacter",
            role: "character"
        };
    }

    return {
        name: "🌙 Ravenkeeper",
        avatar: "https://api.dicebear.com/8.x/adventurer/svg?seed=Raven",
        role: "account"
    };
}

function renderMessages() {
    const messages = state.messages.filter((message) => message.chat === state.activeChat);

    if (!messages.length) {
        elements.messages.innerHTML = `
            <article class="message">
                <div class="bubble">
                    <div class="message-text">Здесь пока пусто. Напишите первое сообщение.</div>
                </div>
            </article>
        `;
        return;
    }

    elements.messages.innerHTML = messages.map((message) => `
        <article class="message ${message.own ? "own" : ""} ${message.exited ? "exited" : ""}">
            <img class="avatar" src="${escapeHtml(message.avatar)}" alt="">
            <div class="bubble">
                <div class="message-meta">
                    <span class="author">${escapeHtml(message.author)}</span>
                    <span class="time">${escapeHtml(message.time)}${message.edited ? " · изменено" : ""}</span>
                </div>
                <div class="message-text">${renderFormattedText(message.text)}</div>
                ${message.attachment ? `<span class="message-attachment">${escapeHtml(message.attachment)}</span>` : ""}
                ${message.own ? `<button class="edit-button" type="button" data-edit="${message.id}">Редактировать</button>` : ""}
            </div>
        </article>
    `).join("");

    elements.messages.scrollTop = elements.messages.scrollHeight;
}

function renderChat() {
    const config = chatConfig[state.activeChat];

    elements.app.dataset.chatTheme = config.theme;
    elements.typeLabel.textContent = config.label;
    elements.title.textContent = config.title;
    elements.description.textContent = config.description;
    elements.notice.textContent = state.blocked && state.activeChat === "flood"
        ? "Вы заблокировали Mira. Он не может написать вам, и вы тоже не можете отправлять ему сообщения."
        : config.notice;
    elements.notice.classList.toggle("warning", state.blocked && state.activeChat === "flood");
    elements.characterPanel.hidden = state.activeChat !== "game";
    elements.exportChat.hidden = state.activeChat !== "game";
    elements.blockUser.hidden = state.activeChat === "notes";
    elements.input.maxLength = config.maxLength || 524288;
    elements.input.placeholder = state.activeChat === "notes"
        ? "Сохраните личную заметку..."
        : "Напишите сообщение...";
    elements.composerRule.textContent = config.rule;

    elements.tabs.forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.chat === state.activeChat);
    });

    renderMessages();
}

function wrapSelection(prefix, suffix = prefix) {
    const { selectionStart, selectionEnd, value } = elements.input;
    const selected = value.slice(selectionStart, selectionEnd) || "текст";
    const nextValue = `${value.slice(0, selectionStart)}${prefix}${selected}${suffix}${value.slice(selectionEnd)}`;
    elements.input.value = nextValue;
    elements.input.focus();
    elements.input.selectionStart = selectionStart + prefix.length;
    elements.input.selectionEnd = selectionStart + prefix.length + selected.length;
}

function insertEmoji() {
    const { selectionStart, value } = elements.input;
    elements.input.value = `${value.slice(0, selectionStart)} 😊 ${value.slice(selectionStart)}`;
    elements.input.focus();
    elements.input.selectionStart = selectionStart + 3;
    elements.input.selectionEnd = selectionStart + 3;
}

function sendMessage(event) {
    event.preventDefault();

    if (state.blocked && state.activeChat === "flood") {
        elements.notice.textContent = "Сообщение не отправлено: между вами и Mira активна взаимная блокировка.";
        elements.notice.classList.add("warning");
        return;
    }

    if (state.activeChat === "flood") {
        const timeSinceLastMessage = Date.now() - state.lastFloodSentAt;
        if (timeSinceLastMessage < FLOOD_COOLDOWN_MS) {
            const wait = Math.ceil((FLOOD_COOLDOWN_MS - timeSinceLastMessage) / 1000);
            elements.notice.textContent = `Подождите ${wait} сек. перед следующим флуд-сообщением.`;
            elements.notice.classList.add("warning");
            return;
        }
    }

    const text = elements.input.value.trim();
    if (!text && !state.selectedAttachment) {
        return;
    }

    const author = currentAuthor();
    state.messages.push({
        id: `${state.activeChat}-${Date.now()}`,
        chat: state.activeChat,
        author: author.name,
        avatar: author.avatar,
        role: author.role,
        text: text || "Вложение без подписи",
        time: getCurrentTime(),
        exited: false,
        own: true,
        attachment: state.selectedAttachment
    });

    if (state.activeChat === "flood") {
        state.lastFloodSentAt = Date.now();
    }

    if (state.activeChat === "notes") {
        saveNotes();
    }

    state.selectedAttachment = null;
    elements.attachment.value = "";
    elements.input.value = "";
    elements.notice.classList.remove("warning");
    elements.notice.textContent = chatConfig[state.activeChat].notice;
    renderMessages();
}

function editMessage(messageId) {
    const message = state.messages.find((item) => item.id === messageId);
    if (!message) {
        return;
    }

    const nextText = window.prompt("Изменить текст сообщения", message.text);
    if (nextText === null) {
        return;
    }

    message.text = nextText.trim() || message.text;
    message.edited = true;

    if (message.chat === "notes") {
        saveNotes();
    }

    renderMessages();
}

function exportGameChat() {
    const lines = state.messages
        .filter((message) => message.chat === "game")
        .map((message) => {
            const marker = message.exited ? " (персонаж вышел)" : "";
            return `[${message.time}] ${message.author}${marker}: ${message.text}`;
        })
        .join("\n\n");
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "raven-rp-game-chat.txt";
    link.click();
    URL.revokeObjectURL(link.href);
}

function handleAttachment(event) {
    const [file] = event.target.files;
    if (!file) {
        state.selectedAttachment = null;
        return;
    }

    if (file.size > SAFE_ATTACHMENT_SIZE) {
        elements.notice.textContent = "Файл слишком большой для демо. Безопасный лимит: 25 MB.";
        elements.notice.classList.add("warning");
        event.target.value = "";
        state.selectedAttachment = null;
        return;
    }

    state.selectedAttachment = `${file.name} (${Math.ceil(file.size / 1024)} KB)`;
    elements.notice.textContent = `Вложение готово к отправке: ${state.selectedAttachment}`;
    elements.notice.classList.remove("warning");
}

function updateProfileCounter() {
    elements.profileCount.textContent = elements.profileDescription.textContent.trim().length;
}

elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        state.activeChat = tab.dataset.chat;
        renderChat();
    });
});

document.querySelector(".toolbar").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) {
        return;
    }

    const format = button.dataset.format;
    if (format === "bold") wrapSelection("**");
    if (format === "italic") wrapSelection("*");
    if (format === "underline") wrapSelection("++");
    if (format === "strike") wrapSelection("~~");
    if (button.dataset.insert === "emoji") insertEmoji();
});

elements.messages.addEventListener("click", (event) => {
    const button = event.target.closest("[data-edit]");
    if (button) {
        editMessage(button.dataset.edit);
    }
});

elements.composer.addEventListener("submit", sendMessage);
elements.attachment.addEventListener("change", handleAttachment);
elements.exportChat.addEventListener("click", exportGameChat);
elements.blockUser.addEventListener("click", () => {
    state.blocked = !state.blocked;
    elements.blockUser.textContent = state.blocked ? "Разблокировать Mira" : "Заблокировать Mira";
    renderChat();
});
elements.addPlayer.addEventListener("click", () => {
    const login = elements.userSearch.value.trim() || "new_player";
    elements.userSearch.value = "";
    elements.notice.textContent = `Игрок ${login} добавлен в демо-список. В production это станет заявкой в друзья/игроки.`;
    elements.notice.classList.remove("warning");
});

loadNotes();
updateProfileCounter();
renderChat();