const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Путь к файлу с данными
const DATA_FILE = path.join(__dirname, 'reviews.json');

// Middleware
app.use(cors());
app.use(express.json());

// *** ЭТА СТРОЧКА ОТДАЁТ index.html ИЗ ПАПКИ public ***
app.use(express.static(path.join(__dirname, 'public')));

// ---- Вспомогательные функции ----
function readReviews() {
  if (!fs.existsSync(DATA_FILE)) return [];
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

function computeStats(reviews) {
  const total = reviews.length;
  if (total === 0) {
    return { total: 0, average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
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
    average: Math.round(avg * 10) / 10,
    distribution: dist
  };
}

// ---- API ----
app.get('/api/reviews', (req, res) => {
  const reviews = readReviews();
  const stats = computeStats(reviews);
  const recent = reviews.slice(-50).reverse();
  res.json({ ...stats, reviews: recent });
});

app.post('/api/reviews', (req, res) => {
  const { rating, nickname, comment, user_id } = req.body;

  if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Рейтинг должен быть от 1 до 5' });
  }

  const reviews = readReviews();
  const newReview = {
    id: Date.now() + Math.random(),
    rating: rating,
    nickname: (nickname || 'Аноним').trim().slice(0, 50),
    comment: (comment || '').trim().slice(0, 500),
    user_id: user_id || null,
    created_at: new Date().toISOString()
  };

  reviews.push(newReview);
  writeReviews(reviews);

  res.status(201).json({ success: true, review: newReview });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
  console.log(`📊 API: /api/reviews`);
});
