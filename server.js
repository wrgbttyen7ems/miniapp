const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Раздача статики
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Хардкодим URL вашего проекта (он публичный и безопасный)
const supabaseUrl = process.env.SUPABASE_URL || 'https://gazttkzrjoctrkbkiwpd.supabase.co';
// Ключ берем из переменных Render
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey) {
  console.error("ОШИБКА: Забыли указать SUPABASE_KEY в Render Environment Variables!");
}

const supabase = createClient(supabaseUrl, supabaseKey || '');

// GET /api/reviews — получение отзывов из Supabase
app.get('/api/reviews', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Ошибка при получении отзывов:', error.message);
    res.status(500).json({ error: 'Не удалось загрузить отзывы' });
  }
});

// POST /api/reviews — добавление отзыва в Supabase
app.post('/api/reviews', async (req, res) => {
  try {
    const { user_id, text, rating } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Текст отзыва не может быть пустым' });
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert([
        {
          user_id: user_id || null,
          text: text,
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
