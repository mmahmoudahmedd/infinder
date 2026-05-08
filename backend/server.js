import 'dotenv/config';

import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import investmentsRoutes from './routes/investments.js';
import paymentsRoutes from './routes/payments.js';
import learningRoutes from './routes/learning.js';
import rewardsRoutes from './routes/rewards.js';
import adminRoutes from './routes/admin.js';
import assistantRoutes from './routes/assistant.js';
import analyticsRoutes from './routes/analytics.js';
import depositsRoutes from './routes/deposits.js';

const app = express();
app.set('trust proxy', 1);

const origin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

app.use(
  cors({
    origin: [origin, /^http:\/\/localhost:\d+$/, /^https:\/\/.*\.vercel\.app$/],
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => res.json({ ok: true }));
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/investments', investmentsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/deposits', depositsRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

// Only listen in development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`INFINDER API listening on ${PORT}`);
  });
}

// Export for Vercel
export default app;