const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

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

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Admin Panel is accessible at http://localhost:${PORT}/admin.html`);
});
