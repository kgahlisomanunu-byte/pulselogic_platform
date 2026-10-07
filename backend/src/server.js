// backend/src/server.js
// ═══════════════════════════════════════════════════════════════════
// PULSELOGIC HEALTH - MAIN SERVER
// ═══════════════════════════════════════════════════════════════════

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ═══════════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3000',
        'http://localhost:5000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    }
});
app.use('/api/', limiter);

// ═══════════════════════════════════════════════════════════════════
// DATABASE
// ═══════════════════════════════════════════════════════════════════
const db = require('./config/db');

// ═══════════════════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════════════════

// Safe route loader — server won't crash if a route file is missing
const loadRoute = (name, path) => {
    try {
        const route = require(path);
        app.use(`/api/${name}`, route);
        console.log(`✅ Loaded route: /api/${name}`);
    } catch (error) {
        console.error(`⚠️  Failed to load /api/${name}: ${error.message}`);
    }
};

// Load all routes
loadRoute('auth', './routes/auth');
loadRoute('patients', './routes/patients');
loadRoute('appointments', './routes/appointments');
loadRoute('queue', './routes/queue');
loadRoute('maternity', './routes/maternity');
loadRoute('reports', './routes/reports');
loadRoute('facilities', './routes/facilities');
loadRoute('users', './routes/users');
loadRoute('vitals', './routes/vitals');
loadRoute('lab', './routes/lab');
loadRoute('medications', './routes/medications');
loadRoute('reminders', './routes/reminders');

// ═══════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// ═══════════════════════════════════════════════════════════════════
// 404 HANDLER
// ═══════════════════════════════════════════════════════════════════
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// ═══════════════════════════════════════════════════════════════════
// GLOBAL ERROR HANDLER
// ═══════════════════════════════════════════════════════════════════
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ═══════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🚀 PulseLogic Health Server Running             ║
║                                                   ║
║   📡 Port: ${PORT}                                   ║
║   🌐 URL: http://localhost:${PORT}                   ║
║   📋 Health: http://localhost:${PORT}/api/health    ║
║   📊 Reports: http://localhost:${PORT}/api/reports  ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
    `);
});

module.exports = app;