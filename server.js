const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // если потребуется для локальной разработки

const app = express();
const PORT = process.env.PORT || 3000;

// Путь к файлу с данными (в той же папке)
const DATA_FILE = path.join(__dirname, 'reviews.json');

// Middleware
app.use(cors()); // разрешаем запросы с любых источников (для разработки)
app.use(express.json());
app.use(express.static(__dirname));

// ---- Вспомогательные функции для работы с JSON ----
function readReviews() {
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Ошибка чтения файла:', err);
    return [];
  }
}

function writeReviews(reviews) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(reviews, null, 2), 'utf8');
}

// Вычисление статистики
function computeStats(reviews) {
  const total = reviews.length;
  if (total === 0) {
    return {
      total: 0,
      average: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const avg = sum / total;
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) {
      dist[r.rating] = (dist[r.rating] || 0) + 1;
    }
  });
  return {
    total,
    average: Math.round(avg * 10) / 10, // один знак после запятой
    distribution: dist
  };
}

// ---- API ----
// GET /api/reviews – получить статистику и список отзывов
app.get('/api/reviews', (req, res) => {
  const reviews = readReviews();
  const stats = computeStats(reviews);
  // Возвращаем последние 50 отзывов (для экономии трафика)
  const recent = reviews.slice(-50).reverse();
  res.json({
    ...stats,
    reviews: recent
  });
});

// POST /api/reviews – добавить новый отзыв
app.post('/api/reviews', (req, res) => {
  const { rating, nickname, comment, user_id } = req.body;

  // Валидация
  if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Рейтинг должен быть от 1 до 5' });
  }

  const reviews = readReviews();
  const newReview = {
    id: Date.now() + Math.random(), // простой уникальный идентификатор
    rating: rating,
    nickname: (nickname || 'Аноним').trim().slice(0, 50),
    comment: (comment || '').trim().slice(0, 500),
    user_id: user_id || null,
    created_at: new Date().toISOString()
  };

  reviews.push(newReview);
  writeReviews(reviews);

  res.status(201).json({
    success: true,
    review: newReview
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`API доступно по адресу http://localhost:${PORT}/api/reviews`);
});