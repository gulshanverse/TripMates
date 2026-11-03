import express from 'express';
import { createServer } from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { z } from 'zod';
import { travelStore } from './store';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const port = Number(process.env.PORT ?? 3000);
const tripIdSchema = z.string().min(1).max(64);
const visitorId = 'demo-visitor';

async function start() {
  await travelStore.initialize();
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '250kb' }));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.get('/api/health', (_req, res) => res.json({ ok: true, persistence: travelStore.persistenceMode }));
  app.get('/api/overview', async (_req, res) => {
    const [destinationList, tripList, buddyList] = await Promise.all([
      travelStore.listDestinations(), travelStore.listTrips(), travelStore.listBuddies(),
    ]);
    res.json({
      destinations: destinationList,
      trips: tripList,
      buddies: buddyList,
      stats: { travelers: '12.4k', trips: '480+', destinations: '36' },
    });
  });
  app.get('/api/trips', async (req, res) => {
    const destination = typeof req.query.destination === 'string' ? req.query.destination : undefined;
    res.json(await travelStore.listTrips(destination));
  });
  app.get('/api/trips/:tripId', async (req, res) => {
    const parsed = tripIdSchema.safeParse(req.params.tripId);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid trip id' });
    const trip = await travelStore.getTrip(parsed.data);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    return res.json(trip);
  });
  app.post('/api/trips/:tripId/save', async (req, res) => {
    const parsed = tripIdSchema.safeParse(req.params.tripId);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid trip id' });
    const saved = await travelStore.saveTrip(parsed.data, visitorId);
    if (!saved) return res.status(404).json({ message: 'Trip not found' });
    return res.status(201).json({ saved: true, tripId: parsed.data });
  });
  app.get('/api/buddies', async (_req, res) => res.json(await travelStore.listBuddies()));
  app.post('/api/buddies/:buddyId/interest', async (req, res) => {
    const parsed = tripIdSchema.safeParse(req.params.buddyId);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid buddy id' });
    const interested = await travelStore.expressInterest(parsed.data, visitorId);
    if (!interested) return res.status(404).json({ message: 'Traveler not found' });
    return res.status(201).json({ interested: true, buddyId: parsed.data });
  });

  const publicDir = path.join(root, 'public');
  app.use(express.static(publicDir));
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({ root: path.join(root, 'src/client'), server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
    app.use(async (req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
      try {
        const template = fs.readFileSync(path.join(root, 'src/client/index.html'), 'utf-8');
        const html = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (error) { vite.ssrFixStacktrace(error as Error); next(error); }
    });
  } else {
    app.use(express.static(path.join(root, 'dist')));
    app.get('*', (_req, res) => res.sendFile(path.join(root, 'dist/index.html')));
  }

  const server = createServer(app);
  server.listen(port, '0.0.0.0', () => console.log(`[TripMates] listening on ${port}`));
}

start().catch((error) => { console.error(error); process.exit(1); });
