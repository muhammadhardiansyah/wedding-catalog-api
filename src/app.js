import express from 'express';
import path from 'path';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import categoryRoutes from './routes/categories.js';
import tagRoutes from './routes/tags.js';
import designRoutes from './routes/designs.js';

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/storage', express.static(path.join(process.cwd(), 'public', 'storage')));

// Health / Welcome
app.get('/', (req, res) => {
  res.json({
    message: 'Wedding Catalog API is running',
    version: '1.0.0',
    status: 'online',
    driver: 'drivemyadmin'
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'Wedding Catalog API is running',
    version: '1.0.0',
    status: 'online',
    driver: 'drivemyadmin'
  });
});

// Mount routes under /api
const apiRouter = express.Router();
apiRouter.use('/admin', authRoutes);
apiRouter.use('/categories', categoryRoutes);
apiRouter.use('/tags', tagRoutes);
apiRouter.use('/designs', designRoutes);
apiRouter.use('/', categoryRoutes);
apiRouter.use('/', tagRoutes);
apiRouter.use('/', designRoutes);

app.use('/api', apiRouter);

// Also mount directly under / so requests to /designs or /api/designs both succeed
app.use('/admin', authRoutes);
app.use('/categories', categoryRoutes);
app.use('/tags', tagRoutes);
app.use('/designs', designRoutes);

// Fallback 404
app.use((req, res) => {
  res.status(404).json({ message: `Route [${req.method} ${req.url}] not found.` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[API Error]:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  });
});

export default app;
