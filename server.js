const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Раздаём статические файлы (index.html)
app.use(express.static(path.join(__dirname)));

const DB_FILE = path.join(__dirname, 'reviews.json');

// Чтение базы данных из файла
function readReviews() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf8');
            return [];
        }
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data || '[]');
    } catch (err) {
        console.error('Ошибка чтения файла:', err);
        return [];
    }
}

// Запись базы данных в файл
function writeReviews(reviews) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(reviews, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('Ошибка записи файла:', err);
        return false;
    }
}

// GET: Получение отзывов
app.get('/api/reviews', (req, res) => {
    const reviews = readReviews();
    const currentUserId = req.query.userId ? String(req.query.userId) : null;

    // Логика видимости:
    // 1. Оценка >= 4 — видна ВСЕМ.
    // 2. Оценка < 4 — видна ТОЛЬКО автору (совпадение userId).
    const visibleReviews = reviews.filter(review => {
        if (review.rating >= 4) {
            return true;
        }
        if (currentUserId && String(review.userId) === currentUserId) {
            return true;
        }
        return false;
    });

    res.json(visibleReviews);
});

// POST: Добавление нового отзыва
app.post('/api/reviews', (req, res) => {
    const { name, rating, text, userId } = req.body;

    if (!rating || !text) {
        return res.status(400).json({ error: 'Рейтинг и текст обязательны для заполнения' });
    }

    const reviews = readReviews();

    const newReview = {
        id: Date.now(),
        name: name && name.trim() ? name.trim() : 'Аноним',
        rating: Number(rating),
        text: text.trim(),
        userId: userId ? String(userId) : null, // Запоминаем Telegram ID автора
        date: new Date().toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    };

    reviews.unshift(newReview); // Добавляем новый отзыв в начало списка

    if (writeReviews(reviews)) {
        res.status(201).json(newReview);
    } else {
        res.status(500).json({ error: 'Не удалось сохранить отзыв' });
    }
});

// Возврат главной страницы
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
