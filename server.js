const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // для раздачи index.html

// Подключение к Supabase через переменные окружения
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("ОШИБКА: Не заданы SUPABASE_URL или SUPABASE_KEY в Environment Variables!");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// GET /api/reviews — получение последних 50 отзывов
app.get('/api/reviews', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Ошибка при получении отзывов:', error.message);
    res.status(500).json({ error: 'Не удалось загрузить отзывы' });
  }
});

// POST /api/reviews — добавление нового отзыва
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
