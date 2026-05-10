const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const loadLocalEnv = () => {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) return;
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, '');
        if (key && !process.env[key]) process.env[key] = value;
    });
};

loadLocalEnv();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const DB_PATH = path.join(__dirname, 'data.json');

const readDB = () => {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading DB:", err);
        return { settings: {}, stats: {}, news: [], blogs: [] };
    }
};

const writeDB = (data) => {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error("Error writing DB:", err);
        return false;
    }
};

app.get('/api/data', (req, res) => {
    res.json(readDB());
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '123456') {
        res.json({ success: true, token: 'admin-token-xyz' });
    } else {
        res.status(401).json({ success: false, message: 'Hatalı kullanıcı adı veya şifre' });
    }
});

const checkAuth = (req, res, next) => {
    const token = req.headers.authorization;
    if (token === 'admin-token-xyz') {
        next();
    } else {
        res.status(401).json({ error: 'Yetkisiz erişim' });
    }
};

app.post('/api/settings', checkAuth, (req, res) => {
    const db = readDB();
    if (req.body.settings) db.settings = { ...db.settings, ...req.body.settings };
    if (req.body.stats) db.stats = { ...db.stats, ...req.body.stats };
    writeDB(db);
    res.json({ success: true, data: db });
});

app.post('/api/upload', checkAuth, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Resim yüklenemedi' });
    }
    const imageUrl = '/uploads/' + req.file.filename;
    res.json({ success: true, imageUrl: imageUrl });
});

app.post('/api/blogs', checkAuth, (req, res) => {
    const db = readDB();
    const blog = req.body;
    
    if (!blog.id) {
        blog.id = Date.now().toString();
        blog.date = new Date().toLocaleDateString('tr-TR');
        db.blogs.push(blog);
    } else {
        const index = db.blogs.findIndex(b => b.id === blog.id);
        if (index !== -1) {
            db.blogs[index] = { ...db.blogs[index], ...blog };
        }
    }
    
    writeDB(db);
    res.json({ success: true, blogs: db.blogs });
});

app.delete('/api/blogs/:id', checkAuth, (req, res) => {
    const db = readDB();
    db.blogs = db.blogs.filter(b => b.id !== req.params.id);
    writeDB(db);
    res.json({ success: true, blogs: db.blogs });
});

const DERNEK_ASSISTANT_INSTRUCTION = `Sen Avcılar Şanlıurfa Derneği'nin resmi dijital asistanısın. Görevin dernek üyelerine ve ziyaretçilere yardımcı olmaktır. Sadece dernek tüzüğü, etkinlikler, üyelik süreci ve Şanlıurfa kültürü ile ilgili konularda bilgi ver. Dernek ile ilgili olmayan veya zararlı içerik soranlara 'Bu konu hakkında bilgi veremem, dernek yönetimimize danışabilirsiniz' şeklinde nezaketli bir yanıt ver. Daima nazik, resmi ve yardımsever bir dil kullan. Kullanıcı isterse Şanlıurfa kültürüne uygun samimi yöresel bir üslup kullanabilirsin; yine de resmi saygıyı koru.`;

app.post('/api/assistant', async (req, res) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const message = (req.body && req.body.message ? String(req.body.message) : '').trim();

        if (!apiKey) {
            return res.status(500).json({ success: false, message: 'Yapay zeka API anahtarı bulunamadı.' });
        }

        if (!message) {
            return res.status(400).json({ success: false, message: 'Lütfen bir mesaj yazın.' });
        }

        const db = readDB();
        const context = {
            settings: db.settings || {},
            stats: db.stats || {},
            pages: (db.blogs || [])
                .filter(item => ['Sayfa', 'TemelDeger', 'Duyuru', 'Haber', 'Blog'].includes(item.type || ''))
                .slice(0, 20)
                .map(item => ({ title: item.title, type: item.type, date: item.date, content: item.content }))
        };

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(apiKey)}`;
        const aiResponse = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: DERNEK_ASSISTANT_INSTRUCTION }]
                },
                contents: [{
                    role: 'user',
                    parts: [{
                        text: `Dernek sitesindeki güncel içerik özeti: ${JSON.stringify(context)}\n\nZiyaretçi sorusu: ${message}`
                    }]
                }]
            })
        });

        const result = await aiResponse.json();
        if (!aiResponse.ok) {
            console.error('Gemini API error:', result);
            return res.status(502).json({ success: false, message: 'Yapay zeka servisi şu an yanıt veremiyor.' });
        }

        const reply = result?.candidates?.[0]?.content?.parts
            ?.map(part => part.text || '')
            .join('')
            .trim();

        res.json({
            success: true,
            reply: reply || 'Şu an yanıt oluşturamadım, dernek yönetimimize danışabilirsiniz.'
        });
    } catch (err) {
        console.error('Assistant error:', err);
        res.status(500).json({ success: false, message: 'Yapay zeka asistanı çalışırken bir hata oluştu.' });
    }
});
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Admin Panel is accessible at http://localhost:${PORT}/admin.html`);
});

