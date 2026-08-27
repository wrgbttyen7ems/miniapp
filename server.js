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

// GET /api/reviews — отправляем отзывы с запасом по ключам
app.get('/api/reviews', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Ошибка чтения из Supabase:', error);
      return res.status(500).json({ error: error.message });
    }

    // Собираем объекты так, чтобы фронтенд точно нашел нужное поле
    const formatted = (data || []).map(r => ({
      id: r.id,
      user_id: r.user_id,
      author: r.user_id ? `ID: ${r.user_id}` : 'Аноним',
      name: r.user_id ? `ID: ${r.user_id}` : 'Аноним',
      text: r.text,
      comment: r.text,
      review: r.text,
      rating: r.rating || 5,
      stars: r.rating || 5,
      date: r.created_at || new Date().toISOString()
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Ошибка сервера:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// POST /api/reviews — создаем отзыв и сразу отдаем обновленный список
app.post('/api/reviews', async (req, res) => {
  try {
    const reviewText = req.body.text || req.body.comment || req.body.review || req.body.message || req.body.content;
    const { user_id, rating } = req.body;

    if (!reviewText || String(reviewText).trim() === '') {
      return res.status(400).json({ error: 'Текст отзыва не может быть пустым' });
    }

    const { error: insertError } = await supabase
      .from('reviews')
      .insert([
        {
          user_id: user_id || null,
          text: String(reviewText).trim(),
          rating: rating || 5
        }
      ]);

    if (insertError) throw insertError;

    // Сразу запрашиваем свежий список из базы
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    res.status(201).json({ success: true, reviews: data || [] });
  } catch (error) {
    console.error('Ошибка сохранения:', error.message);
    res.status(500).json({ error: 'Не удалось сохранить отзыв' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
});
