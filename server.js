require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/storage', express.static(path.join(__dirname, 'server', 'storage')));

// API Routes
app.use('/api/auth', require('./api/auth'));
app.use('/api/admin', require('./api/admin'));
app.use('/api/claims', require('./api/claims'));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Fallback to index.html for SPA-like behavior
app.get(/^(?!\/api).+/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const fs = require('fs-extra');

// Ensure required directories exist on startup
const fwdTemplatesDir = path.join(__dirname, 'server', 'storage', 'fwd_templates');
fs.ensureDirSync(fwdTemplatesDir);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
