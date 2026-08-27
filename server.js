const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Принудительно очищаем URL от любых лишних пробелов/переносов
const rawUrl = process.env.SUPABASE_URL || 'https://gazttkzrjoctrkbkiwpd.supabase.co';
const supabaseUrl = rawUrl.trim();
const supabaseKey = (process.env.SUPABASE_KEY || '').trim();

console.log('Используемый URL:', `"${supabaseUrl}"`);

const supabase = createClient(supabaseUrl, supabaseKey);

// GET /api/reviews — получение отзывов
app.get('/api/reviews', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Ошибка Supabase при чтении:', error);
      throw error;
    }

    // Форматируем массив, чтобы фронтенд точно получил нужные поля
    const formattedReviews = (data || []).map(r => ({
      id: r.id,
      user_id: r.user_id,
      author: r.user_id ? `Пользователь ${r.user_id}` : 'Аноним',
      text: r.text,
      rating: r.rating || 5,
      date: r.created_at
    }));

    res.json(formattedReviews);
  } catch (error) {
    console.error('Ошибка при получении отзывов:', error.message);
    res.status(500).json({ error: 'Не удалось загрузить отзывы' });
  }
});

// POST /api/reviews
// POST /api/reviews — добавление отзыва
app.post('/api/reviews', async (req, res) => {
  try {
    console.log('Пришедшие данные:', req.body); // Логируем в консоль Render для проверки

    // Собираем текст из любого возможного названия поля
    const reviewText = req.body.text || req.body.comment || req.body.review || req.body.message || req.body.content;
    const { user_id, rating } = req.body;

    if (!reviewText || String(reviewText).trim() === '') {
      return res.status(400).json({ error: 'Текст отзыва не может быть пустым' });
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert([
        {
          user_id: user_id || null,
          text: String(reviewText).trim(),
          rating: rating || 5
        }
      ])
      .select();

    if (error) throw error;

    res.status(201).json({ success: true, review: data[0] });
  } catch (error) {
    console.error('Ошибка при сохранении отзыва:', error.message);
    res.status(500).json({ error: 'Не удалось сохранить отзыв' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
});
