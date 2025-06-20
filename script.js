// Масив постів (можна замінити на завантаження з сервера)
const posts = [
    {
        title: "Перший пост",
        date: "2025-06-20",
        content: "Вітаю у моєму блозі! Тут будуть цікаві записи."
    },
    {
        title: "Ще один запис",
        date: "2025-06-19",
        content: "Це ще один приклад посту в блозі."
    }
];

const blogSection = document.getElementById('blog-posts');

posts.forEach(post => {
    const div = document.createElement('div');
    div.className = 'post';
    div.innerHTML = `
        <h2>${post.title}</h2>
        <small>${post.date}</small>
        <p>${post.content}</p>
    `;
    blogSection.appendChild(div);
});