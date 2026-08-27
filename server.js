const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ===== Подключение к Supabase =====
const rawUrl = process.env.SUPABASE_URL || 'https://gazttkzrjoctrkbkiwpd.supabase.co';
const supabaseUrl = rawUrl.trim();
const supabaseKey = (process.env.SUPABASE_KEY || '').trim();

const supabase = createClient(supabaseUrl, supabaseKey);

// ===== ЖЁСТКО ОТДАЁМ index.html =====
app.get('/', (req, res) => {
    const possiblePaths = [
        path.join(__dirname, 'public', 'index.html'),
        path.join(__dirname, 'index.html'),
        path.join('/app', 'public', 'index.html'),
        path.join('/app', 'index.html')
    ];

    for (const indexPath of possiblePaths) {
        if (fs.existsSync(indexPath)) {
            console.log(`✅ Найден index.html: ${indexPath}`);
            return res.sendFile(indexPath);
        }
    }

    console.log('❌ index.html НЕ НАЙДЕН!');
    res.status(404).send(`<h1>❌ index.html не найден</h1>`);
});

// Дополнительно раздаем статические файлы (css, js)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// ===== Вспомогательная функция расчета статистики =====
function computeStats(reviews) {
    const total = reviews.length;
    if (total === 0) {
        return { total: 0, average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    }
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    const avg = sum / total;
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => {
        const rating = r.rating || 5;
        if (rating >= 1 && rating <= 5) {
            dist[rating] = (dist[rating] || 0) + 1;
        }
    });
    return {
        total,
        average: Math.round(avg * 10) / 10,
        distribution: dist
    };
}

// ===== API =====

// 1. Получение отзывов со статистикой
app.get('/api/reviews', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const reviews = data || [];

        // Преобразуем формат данных из Supabase под ожидания фронтенда
        const formattedReviews = reviews.map(r => ({
            id: r.id,
            rating: r.rating || 5,
            nickname: r.nickname || (r.user_id ? `ID: ${r.user_id}` : 'Аноним'),
            comment: r.text || r.comment || '',
            user_id: r.user_id || null,
            created_at: r.created_at
        }));

        const stats = computeStats(formattedReviews);
        const recent = formattedReviews.slice(0, 50);

        // Возвращаем точную структуру, которую ждет твой фронтенд!
        res.json({ ...stats, reviews: recent });
    } catch (err) {
        console.error('Ошибка при получении отзывов:', err.message);
        res.status(500).json({ error: 'Не удалось загрузить отзывы' });
    }
});

// 2. Публикация отзыва
// 2. Публикация отзыва
app.post('/api/reviews', async (req, res) => {
    try {
        const { rating, nickname, comment, text, user_id } = req.body;

        const reviewRating = Number(rating);
        if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
            return res.status(400).json({ error: 'Рейтинг должен быть от 1 до 5' });
        }

        // --- ФИЛЬТР: Отзывы ниже 4 звёзд игнорируем ---
        if (reviewRating < 4) {
            // Возвращаем успешный ответ клиенту, чтобы фронтенд показал "Спасибо за отзыв!",
            // но в базу данных (Supabase) ничего НЕ сохраняем.
            return res.status(201).json({ 
                success: true, 
                message: 'Отзыв принят',
                review: {
                    id: Date.now(),
                    rating: reviewRating,
                    nickname: (nickname || 'Аноним').trim().slice(0, 50),
                    comment: (comment || text || '').trim().slice(0, 500),
                    user_id: user_id || null,
                    created_at: new Date().toISOString()
                }
            });
        }
        // ----------------------------------------------

        const reviewComment = (comment || text || '').trim().slice(0, 500);

        // В базу попадают только отзывы на 4 и 5 звёзд
        const { data, error } = await supabase
            .from('reviews')
            .insert([
                {
                    user_id: user_id || null,
                    text: reviewComment,
                    rating: reviewRating
                }
            ])
            .select();

        if (error) throw error;

        const createdReview = data[0];
        const responseReview = {
            id: createdReview.id,
            rating: createdReview.rating,
            nickname: (nickname || 'Аноним').trim().slice(0, 50),
            comment: createdReview.text,
            user_id: createdReview.user_id,
            created_at: createdReview.created_at
        };

        res.status(201).json({ success: true, review: responseReview });
    } catch (err) {
        console.error('Ошибка при сохранении отзыва:', err.message);
        res.status(500).json({ error: 'Не удалось сохранить отзыв' });
    }
});
// Запуск сервера
app.listen(PORT, () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
});
