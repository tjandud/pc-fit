const express = require('express');
const cors = require('cors');
const { generalLimiter } = require('./config/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const recommendRoutes = require('./routes/recommendRoutes');
const searchRoutes = require('./routes/searchRoutes');
const compatibilityRoutes = require('./routes/compatibilityRoutes');
const buildRoutes = require('./routes/buildRoutes');
const takeoffRoutes = require('./routes/takeoffRoutes');
const youtubeRoutes = require('./routes/youtubeRoutes');

const app = express();
app.set('trust proxy', 1);

const cookieParser = require('cookie-parser');
app.use(cookieParser());

const { createSessionMiddleware } = require('./config/session');
app.use(createSessionMiddleware());

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:8080')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes('*') ||
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.onrender.com') ||
      origin.startsWith('http://localhost:')
    ) {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true          // 세션 쿠키 허용
}));
app.use(express.json({ limit: '1mb' }));
app.use(generalLimiter);

// 세션 미들웨어는 bin/www에서 DB 연결 후 주입
// app.use(sessionMiddleware) ← bin/www에서 처리

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/recommend', recommendRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/compatibility', compatibilityRoutes);
app.use('/api/v1/builds', buildRoutes);
app.use('/api/v1/takeoffs', takeoffRoutes);
app.use('/api/v1/youtube', youtubeRoutes);

const notificationRoutes = require('./routes/notificationRoutes');
app.use('/api/v1/notifications', notificationRoutes);

const adminRoutes = require('./routes/adminRoutes');
app.use('/api/v1/admin', adminRoutes);

// Seed admin account
const { seedAdmin } = require('./services/adminSeed');
seedAdmin();

app.use((req, res) => {
  res.status(404).json({ success: false, error: '요청한 리소스를 찾을 수 없습니다.' });
});

app.use(errorHandler);

module.exports = app;