import express from 'express';
import { resolve } from 'node:path';
import { networkInterfaces } from 'node:os';
import { createApp } from './app.mjs';
const { app } = createApp();
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(resolve('dist')));
  app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT || 5173);
app.listen(port, '0.0.0.0', () => {
  console.log(`Again is ready at http://localhost:${port}`);
  for (const items of Object.values(networkInterfaces()))
    for (const item of items || []) {
      if (item.family === 'IPv4' && !item.internal)
        console.log(`Same Wi-Fi: http://${item.address}:${port}`);
    }
});
