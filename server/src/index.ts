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

export async function createServer(port?: number) {
  const app = express();
  const PORT = port || 3001;

  app.use(cors());
  app.use(express.json());

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

  await initDatabase();

  return new Promise<{ app: express.Express; url: string }>((resolve) => {
    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      resolve({ app, url: `http://localhost:${PORT}` });
    });
    // Keep reference so we can close it later
    (app as any).__server = server;
  });
}

// Direct start (when running without Electron)
if (require.main === module) {
  createServer(3001);
}
