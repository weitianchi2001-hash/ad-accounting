import express from 'express';
import path from 'path';
import cors from 'cors';
import { initDatabase } from './database';
import { clientsRouter } from './routes/clients';
import { projectsRouter } from './routes/projects';
import { revenuesRouter } from './routes/revenues';
import { expensesRouter } from './routes/expenses';
import { categoriesRouter } from './routes/categories';
import { reportsRouter } from './routes/reports';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api', clientsRouter);
app.use('/api', projectsRouter);
app.use('/api', revenuesRouter);
app.use('/api', expensesRouter);
app.use('/api', categoriesRouter);
app.use('/api', reportsRouter);

// Serve frontend static files
const frontendPath = path.join(__dirname, '..', '..', 'dist');
app.use(express.static(frontendPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Start server, then init database
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Frontend path:', frontendPath);
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'set' : 'NOT SET');
  initDatabase()
    .then(() => console.log('Database ready'))
    .catch(err => console.error('Database init failed:', err.message));
});
