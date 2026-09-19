import express from 'express';
import multer from 'multer';
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import { z } from 'zod';
import QRCode from 'qrcode';
import { openDatabase, seedDemo, uid, hashPassword, checkPassword, parse } from './db.mjs';
import { sourcesFor, buildBrief } from './briefs.mjs';
import { connectionsCsv } from './workflow.mjs';

const short = z.string().trim().min(1).max(180);
const link = z.object({
  label: z.string().trim().max(80),
  url: z
    .string()
    .url()
    .max(1500)
    .refine((v) => /^https?:\/\//i.test(v), 'Use an http or https link'),
});
const profileSchema = z.object({
  name: short,
  company: z.string().trim().max(120).optional(),
  headline: z.string().trim().max(180),
  location: z.string().trim().max(180).default(''),
  bio: z.string().trim().max(8000),
  links: z.array(link).max(10).default([]),
  tags: z.array(z.string().trim().max(50)).max(10).default([]),
});
const connectionSchema = z.object({
  conversation: z.string().trim().min(20).max(3000),
  highlight: z.string().trim().min(4).max(180),
  interest: z.string().trim().max(300).default(''),
});
const noteSchema = z.object({ title: short, text: z.string().trim().min(20).max(30000) });
const roleSchema = z.object({
  title: short,
  team: z.string().trim().max(180).default(''),
  description: z.string().trim().min(20).max(10000),
  requirements: z.array(z.string().trim().min(1).max(200)).min(1).max(12),
});
const publicPerson = ({ id, kind, name, headline, bio, location, company, links, tags }) => ({
  id,
  kind,
  name,
  headline,
  bio,
  location,
  company,
  links,
  tags,
});
const digest = (token) => createHash('sha256').update(token).digest('hex');
const safeMaterial = ({ path, ...material }) => material;
const stripPrivate = ({
  remembered,
  saved,
  stage,
  shortlistedRoles,
  recruiterUpdatedAt,
  ...connection
}) => connection;

async function extractUpload(file) {
  if (!file) return { error: 'Choose a file first.' };
  const ext = extname(file.originalname).toLowerCase();
  if (!['.pdf', '.txt', '.md'].includes(ext))
    return { error: 'Please upload a PDF, TXT, or Markdown file.' };
  let text = '';
  let extraction = 'ready';
  if (ext === '.pdf') {
    if (file.buffer.subarray(0, 5).toString() !== '%PDF-')
      return { error: 'This file is not a valid PDF.' };
    try {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: file.buffer });
      try {
        text = (await parser.getText({ first: 30 })).text;
      } finally {
        await parser.destroy();
      }
      if (!text.trim()) extraction = 'no-text';
    } catch {
      extraction = 'unavailable';
    }
  } else {
    if (file.buffer.includes(0)) return { error: 'This does not look like a text document.' };
    text = file.buffer.toString('utf8');
  }
  return {
    ext,
    title: file.originalname.slice(0, 180),
    text: text.slice(0, 60000),
    extraction,
    size: file.size,
  };
}

export function createApp(options = {}) {
  const dataDir = resolve(options.dataDir || process.env.DATA_DIR || 'data');
  mkdirSync(resolve(dataDir, 'uploads'), { recursive: true });
  const db = options.db || openDatabase(resolve(dataDir, 'again.sqlite'));
  const demoMode = options.demoMode ?? process.env.DEMO_MODE !== 'false';
  if (demoMode) seedDemo(db);
  const config = options.aiConfig || {
    apiKey: process.env.OPENCODE_API_KEY,
    baseUrl: process.env.OPENCODE_BASE_URL || 'https://opencode.ai/zen/go/v1',
    model: process.env.OPENCODE_MODEL || 'glm-5.3',
  };
  const publicUrl = options.publicUrl || process.env.PUBLIC_URL;
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'same-origin');
    res.set('X-Frame-Options', 'DENY');
    if (req.path.startsWith('/api/')) {
      res.set('Cache-Control', 'no-store');
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        if (req.headers['sec-fetch-site'] === 'cross-site')
          return res.status(403).json({ error: 'Cross-site request blocked' });
        const origin = req.get('origin');
        if (origin) {
          try {
            if (new URL(origin).host !== req.get('host'))
              return res.status(403).json({ error: 'Origin does not match' });
          } catch {
            return res.status(403).json({ error: 'Invalid origin' });
          }
        }
      }
    }
    next();
  });
  app.use(express.json({ limit: '200kb' }));
  const authAttempts = new Map();
  app.use('/api/auth', (req, res, next) => {
    if (req.method !== 'POST') return next();
    const now = Date.now();
    for (const [ip, value] of authAttempts) if (value.until < now) authAttempts.delete(ip);
    const current = authAttempts.get(req.ip) || { count: 0, until: now + 60000 };
    current.count++;
    authAttempts.set(req.ip, current);
    if (current.count > 35)
      return res.status(429).json({ error: 'Too many attempts. Try again in a minute.' });
    next();
  });
  app.use('/api', (req, _res, next) => {
    const token = req.headers.cookie
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('again_session='))
      ?.slice(14);
    if (token) {
      const row = db
        .prepare(
          'SELECT users.data FROM users JOIN sessions ON users.id=sessions.user_id WHERE sessions.token=? AND sessions.expires>?',
        )
        .get(digest(token), Date.now());
      req.user = parse(row);
    }
    next();
  });
  app.use('/api', (req, res, next) => {
    // Bind browser requests to the account that rendered their form, even when
    // another tab has replaced the shared session cookie in the meantime.
    const expectedUser = req.get('X-Staylinked-User');
    if (
      expectedUser !== undefined &&
      req.path !== '/session' &&
      !req.path.startsWith('/auth/') &&
      expectedUser !== (req.user?.id ?? 'anonymous')
    )
      return res.status(409).json({
        error: 'Your account changed in another tab. Please try again.',
        code: 'SESSION_CHANGED',
      });
    next();
  });
  const auth = (kind) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Please sign in to continue.' });
    if (kind && req.user.kind !== kind)
      return res.status(403).json({ error: 'This action is not available for your account.' });
    next();
  };
  const session = (req, res, user) => {
    const token = uid() + uid();
    db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
    db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(
      digest(token),
      user.id,
      Date.now() + 7 * 86400000,
    );
    const secure = req.secure || publicUrl?.startsWith('https://');
    res.cookie('again_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: !!secure,
      maxAge: 7 * 86400000,
      path: '/',
    });
    res.json({ user });
  };
  const getUser = (id) => parse(db.prepare('SELECT data FROM users WHERE id=?').get(id));
  const materialsFor = (id) =>
    db
      .prepare('SELECT data FROM materials WHERE candidate_id=? ORDER BY rowid DESC')
      .all(id)
      .map(parse);
  const materialCount = (id) =>
    db.prepare('SELECT count(*) AS count FROM materials WHERE candidate_id=?').get(id).count;
  const eventFor = (id) => parse(db.prepare('SELECT data FROM events WHERE id=?').get(id));
  const expand = (connection) => ({
    ...stripPrivate(connection),
    candidate: getUser(connection.candidateId),
    event: eventFor(connection.eventId),
    materials: materialsFor(connection.candidateId).map(safeMaterial),
  });
  const ownedConnection = (req, res) => {
    const row = db
      .prepare('SELECT data FROM connections WHERE id=? AND recruiter_id=?')
      .get(req.params.id, req.user.id);
    if (!row) {
      res.status(404).json({ error: 'Connection not found.' });
      return null;
    }
    return parse(row);
  };

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/session', (req, res) =>
    res.json({ user: req.user || null, demoMode, aiConfigured: !!config.apiKey }),
  );
  app.post('/api/auth/demo', (req, res) => {
    if (!demoMode) return res.status(404).json({ error: 'Demo accounts are disabled.' });
    const kind = z.enum(['candidate', 'recruiter']).parse(req.body.kind);
    session(req, res, getUser(kind === 'recruiter' ? 'recruiter-demo' : 'aisha-demo'));
  });
  app.post('/api/auth/register', (req, res) => {
    const input = z
      .object({
        name: short,
        email: z.string().email().max(240),
        password: z.string().min(8).max(128),
        kind: z.enum(['candidate', 'recruiter']).default('candidate'),
        company: z.string().trim().max(120).default(''),
      })
      .parse(req.body);
    const email = input.email.toLowerCase().trim();
    if (db.prepare('SELECT id FROM users WHERE email=?').get(email))
      return res
        .status(409)
        .json({ error: 'An account already uses that email. Sign in instead.' });
    const user = {
      id: uid(),
      name: input.name,
      email,
      kind: input.kind,
      company: input.company,
      headline: '',
      location: '',
      bio: '',
      links: [],
      tags: [],
      updatedAt: new Date().toISOString(),
    };
    db.prepare('INSERT INTO users VALUES (?,?,?,?,?)').run(
      user.id,
      email,
      hashPassword(input.password),
      user.kind,
      JSON.stringify(user),
    );
    if (user.kind === 'recruiter') {
      const event = {
        id: uid(),
        recruiterId: user.id,
        name: 'My conversations',
        location: '',
        date: new Date().toISOString().slice(0, 10),
        prompt: 'What did we talk about? Share the detail you would like me to remember.',
      };
      db.prepare('INSERT INTO events VALUES (?,?,?)').run(event.id, user.id, JSON.stringify(event));
    }
    session(req, res, user);
  });
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = z
      .object({ email: z.string().email().max(240), password: z.string().min(1).max(128) })
      .parse(req.body);
    const row = db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase().trim());
    if (!row || !checkPassword(password, row.password))
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    session(req, res, parse(row));
  });
  app.post('/api/auth/logout', (req, res) => {
    const token = req.headers.cookie
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('again_session='))
      ?.slice(14);
    if (token) db.prepare('DELETE FROM sessions WHERE token=?').run(digest(token));
    res.clearCookie('again_session', { path: '/' });
    res.json({ ok: true });
  });
  app.put('/api/profile', auth(), (req, res) => {
    const input = profileSchema.parse(req.body);
    const user = { ...req.user, ...input, updatedAt: new Date().toISOString() };
    db.prepare('UPDATE users SET data=? WHERE id=?').run(JSON.stringify(user), user.id);
    res.json({ user });
  });
  app.get('/api/candidate', auth('candidate'), (req, res) => {
    const connections = db
      .prepare('SELECT data FROM connections WHERE candidate_id=? ORDER BY rowid DESC')
      .all(req.user.id)
      .map(parse)
      .map((c) => {
        const recruiter = getUser(c.recruiterId);
        return {
          ...stripPrivate(c),
          recruiter: {
            ...publicPerson(recruiter),
            email: recruiter.email,
          },
          event: eventFor(c.eventId),
        };
      });
    res.json({
      profile: req.user,
      materials: materialsFor(req.user.id).map(safeMaterial),
      connections,
    });
  });
  app.get('/api/portal/:id', (req, res) => {
    const event = eventFor(req.params.id);
    if (!event) return res.status(404).json({ error: 'This invitation could not be found.' });
    const recruiter = getUser(event.recruiterId);
    const existing =
      req.user?.kind === 'candidate'
        ? parse(
            db
              .prepare('SELECT data FROM connections WHERE candidate_id=? AND event_id=?')
              .get(req.user.id, event.id),
          )
        : null;
    res.json({
      event,
      recruiter: { name: recruiter.name, company: recruiter.company, headline: recruiter.headline },
      existing: existing ? stripPrivate(existing) : null,
    });
  });
  app.post('/api/portal/:id/connect', auth('candidate'), (req, res) => {
    const event = eventFor(req.params.id);
    if (!event) return res.status(404).json({ error: 'This invitation could not be found.' });
    const input = connectionSchema.parse(req.body);
    const existing = parse(
      db
        .prepare('SELECT data FROM connections WHERE candidate_id=? AND event_id=?')
        .get(req.user.id, event.id),
    );
    const now = new Date().toISOString();
    const connection = existing
      ? { ...existing, ...input, updatedAt: now }
      : {
          id: uid(),
          candidateId: req.user.id,
          recruiterId: event.recruiterId,
          eventId: event.id,
          ...input,
          originalConversation: input.conversation,
          createdAt: now,
          updatedAt: now,
        };
    if (existing)
      db.prepare('UPDATE connections SET data=? WHERE id=?').run(
        JSON.stringify(connection),
        connection.id,
      );
    else
      db.prepare('INSERT INTO connections VALUES (?,?,?,?,?)').run(
        connection.id,
        req.user.id,
        event.recruiterId,
        event.id,
        JSON.stringify(connection),
      );
    res.status(existing ? 200 : 201).json({ connection: stripPrivate(connection) });
  });
  app.delete('/api/connections/:id', auth(), (req, res) => {
    const result = db
      .prepare('DELETE FROM connections WHERE id=? AND (candidate_id=? OR recruiter_id=?)')
      .run(req.params.id, req.user.id, req.user.id);
    if (!result.changes) return res.status(404).json({ error: 'Connection not found.' });
    res.json({ ok: true });
  });
  app.post('/api/materials/note', auth('candidate'), (req, res) => {
    if (materialCount(req.user.id) >= 20)
      return res.status(400).json({ error: 'You can share up to 20 materials.' });
    const input = noteSchema.parse(req.body);
    const material = {
      id: uid(),
      candidateId: req.user.id,
      ...input,
      type: 'note',
      createdAt: new Date().toISOString(),
    };
    db.prepare('INSERT INTO materials VALUES (?,?,?)').run(
      material.id,
      req.user.id,
      JSON.stringify(material),
    );
    res.status(201).json({ material });
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  });
  const persistUpload = (file, extracted, candidateId, previous) => {
    const { ext, ...content } = extracted;
    const now = new Date().toISOString();
    const material = {
      ...(previous || { id: uid(), candidateId, type: 'file', createdAt: now }),
      ...content,
      ...(previous ? { updatedAt: now } : {}),
      path: resolve(dataDir, 'uploads', `${uid()}${ext}`),
    };
    try {
      // A replacement never writes over the currently shared file.
      writeFileSync(material.path, file.buffer, { mode: 0o600, flag: 'wx' });
      if (previous)
        db.prepare('UPDATE materials SET data=? WHERE id=? AND candidate_id=?').run(
          JSON.stringify(material),
          material.id,
          candidateId,
        );
      else
        db.prepare('INSERT INTO materials VALUES (?,?,?)').run(
          material.id,
          candidateId,
          JSON.stringify(material),
        );
    } catch (error) {
      // Clean up partial writes as well as files whose database write failed.
      if (error.code !== 'EEXIST') {
        try {
          unlinkSync(material.path);
        } catch (cleanupError) {
          if (cleanupError.code !== 'ENOENT')
            console.error('Upload cleanup failed:', cleanupError.code);
        }
      }
      throw error;
    }
    if (previous?.path) {
      try {
        unlinkSync(previous.path);
      } catch (error) {
        // The replacement has committed; a cleanup failure must not report it as unsaved.
        if (error.code !== 'ENOENT') console.error('Obsolete upload cleanup failed:', error.code);
      }
    }
    return material;
  };
  app.post('/api/materials/upload', auth('candidate'), upload.single('file'), async (req, res) => {
    if (materialCount(req.user.id) >= 20)
      return res.status(400).json({ error: 'You can share up to 20 materials.' });
    const extracted = await extractUpload(req.file);
    if (extracted.error) return res.status(400).json({ error: extracted.error });
    // PDF extraction yields; another upload or note may have filled the last slot.
    if (materialCount(req.user.id) >= 20)
      return res.status(400).json({ error: 'You can share up to 20 materials.' });
    const material = persistUpload(req.file, extracted, req.user.id);
    res.status(201).json({ material: safeMaterial(material) });
  });
  app.put('/api/materials/:id/file', auth('candidate'), upload.single('file'), async (req, res) => {
    const row = db
      .prepare('SELECT data FROM materials WHERE id=? AND candidate_id=?')
      .get(req.params.id, req.user.id);
    const existing = parse(row);
    if (!existing) return res.status(404).json({ error: 'Material not found.' });
    if (existing.type !== 'file')
      return res.status(400).json({ error: 'Only uploaded files can be replaced.' });
    const extracted = await extractUpload(req.file);
    if (extracted.error) return res.status(400).json({ error: extracted.error });
    if (extracted.extraction === 'unavailable')
      return res
        .status(400)
        .json({ error: 'This PDF could not be read. Your previous file is unchanged.' });
    const current = db
      .prepare('SELECT data FROM materials WHERE id=? AND candidate_id=?')
      .get(req.params.id, req.user.id);
    if (!current) return res.status(404).json({ error: 'Material not found.' });
    if (current.data !== row.data)
      return res.status(409).json({
        error: 'This file changed while uploading. Reload it before replacing it.',
        code: 'MATERIAL_CHANGED',
      });
    const material = persistUpload(req.file, extracted, req.user.id, existing);
    res.json({ material: safeMaterial(material) });
  });
  app.get('/api/materials/:id/download', auth(), (req, res, next) => {
    const material = parse(db.prepare('SELECT data FROM materials WHERE id=?').get(req.params.id));
    if (!material?.path) return res.status(404).json({ error: 'File not found.' });
    const owner = material.candidateId === req.user.id;
    const connected =
      req.user.kind === 'recruiter' &&
      db
        .prepare('SELECT id FROM connections WHERE candidate_id=? AND recruiter_id=?')
        .get(material.candidateId, req.user.id);
    if (!owner && !connected) return res.status(404).json({ error: 'File not found.' });
    res.download(material.path, material.title, (error) => {
      if (!error) return;
      if (res.headersSent) return res.destroy();
      if (error.code === 'ENOENT')
        return res.status(404).json({ error: 'The original file is no longer available.' });
      next(error);
    });
  });
  app.patch('/api/materials/:id', auth('candidate'), (req, res) => {
    const existing = parse(
      db
        .prepare('SELECT data FROM materials WHERE id=? AND candidate_id=?')
        .get(req.params.id, req.user.id),
    );
    if (!existing) return res.status(404).json({ error: 'Material not found.' });
    if (existing.type !== 'note')
      return res.status(400).json({
        error: 'Only notes can be edited here. Use Replace file for an uploaded document.',
      });
    const material = {
      ...existing,
      ...noteSchema.parse(req.body),
      updatedAt: new Date().toISOString(),
    };
    db.prepare('UPDATE materials SET data=? WHERE id=?').run(JSON.stringify(material), material.id);
    res.json({ material: safeMaterial(material) });
  });
  app.delete('/api/materials/:id', auth('candidate'), (req, res) => {
    const material = parse(
      db
        .prepare('SELECT data FROM materials WHERE id=? AND candidate_id=?')
        .get(req.params.id, req.user.id),
    );
    if (!material) return res.status(404).json({ error: 'Material not found.' });
    if (material.path && existsSync(material.path)) unlinkSync(material.path);
    db.prepare('DELETE FROM materials WHERE id=?').run(material.id);
    res.json({ ok: true });
  });
  app.get('/api/workspace', auth('recruiter'), (req, res) => {
    res.json({
      connections: db
        .prepare('SELECT data FROM connections WHERE recruiter_id=? ORDER BY rowid ASC')
        .all(req.user.id)
        .map(parse)
        .map(expand),
      events: db
        .prepare('SELECT data FROM events WHERE recruiter_id=?')
        .all(req.user.id)
        .map(parse),
      roles: db.prepare('SELECT data FROM roles WHERE recruiter_id=?').all(req.user.id).map(parse),
    });
  });
  app.post('/api/workspace/export', auth('recruiter'), (req, res) => {
    const { ids } = z.object({ ids: z.array(z.string()).min(1).max(500) }).parse(req.body);
    const connections = [...new Set(ids)].map((id) =>
      parse(
        db
          .prepare('SELECT data FROM connections WHERE id=? AND recruiter_id=?')
          .get(id, req.user.id),
      ),
    );
    if (connections.some((c) => !c))
      return res.status(404).json({ error: 'Connection not found.' });
    res
      .type('text/csv')
      .set('Content-Disposition', 'attachment; filename="staylinked-connections.csv"')
      .send(connectionsCsv(connections.map(expand)));
  });
  app.post('/api/workspace/connections/:id/brief', auth('recruiter'), async (req, res) => {
    const connection = ownedConnection(req, res);
    if (!connection) return;
    const roleId = short.parse(req.body.roleId);
    const role = parse(
      db.prepare('SELECT data FROM roles WHERE id=? AND recruiter_id=?').get(roleId, req.user.id),
    );
    if (!role) return res.status(404).json({ error: 'Role not found.' });
    const profile = getUser(connection.candidateId);
    const sources = sourcesFor(profile, connection, materialsFor(profile.id));
    const brief = await buildBrief({
      profile,
      connection,
      role,
      sources,
      db,
      config,
      fetchImpl: options.fetchImpl,
    });
    // Slow provider calls must not outlive the permission or source snapshot.
    const current = ownedConnection(req, res);
    if (!current) return;
    const currentRole = parse(
      db.prepare('SELECT data FROM roles WHERE id=? AND recruiter_id=?').get(roleId, req.user.id),
    );
    if (JSON.stringify(currentRole) !== JSON.stringify(role))
      return res
        .status(409)
        .json({ error: 'This role changed. Please try again.', code: 'ROLE_CHANGED' });
    const currentSources = sourcesFor(
      getUser(current.candidateId),
      current,
      materialsFor(current.candidateId),
    );
    if (
      current.updatedAt !== connection.updatedAt ||
      JSON.stringify(currentSources) !== JSON.stringify(sources)
    )
      return res.status(409).json({
        error: 'This profile or shared work changed. Please try again.',
        code: 'SOURCES_CHANGED',
      });
    res.json({ brief, sources });
  });
  app.post('/api/roles', auth('recruiter'), (req, res) => {
    const input = roleSchema.parse(req.body);
    const role = { id: uid(), recruiterId: req.user.id, ...input };
    db.prepare('INSERT INTO roles VALUES (?,?,?)').run(role.id, req.user.id, JSON.stringify(role));
    res.status(201).json({ role });
  });
  app.patch('/api/workspace/roles/:id', auth('recruiter'), (req, res) => {
    const existing = parse(
      db
        .prepare('SELECT data FROM roles WHERE id=? AND recruiter_id=?')
        .get(req.params.id, req.user.id),
    );
    if (!existing) return res.status(404).json({ error: 'Role not found.' });
    const role = { ...existing, ...roleSchema.parse(req.body) };
    db.prepare('UPDATE roles SET data=? WHERE id=? AND recruiter_id=?').run(
      JSON.stringify(role),
      role.id,
      req.user.id,
    );
    res.json({ role });
  });
  app.post('/api/events', auth('recruiter'), (req, res) => {
    const input = z
      .object({
        name: short,
        location: z.string().trim().max(180),
        date: z.iso.date(),
        prompt: z.string().trim().min(10).max(500),
      })
      .parse(req.body);
    const event = { id: uid(), recruiterId: req.user.id, ...input };
    db.prepare('INSERT INTO events VALUES (?,?,?)').run(
      event.id,
      req.user.id,
      JSON.stringify(event),
    );
    res.status(201).json({ event });
  });
  app.get('/api/events/:id/qr', auth('recruiter'), async (req, res) => {
    const event = eventFor(req.params.id);
    if (!event || event.recruiterId !== req.user.id)
      return res.status(404).json({ error: 'Event not found.' });
    const requestHost = req.get('host');
    const interfaces = networkInterfaces();
    const localAddress = [...(interfaces.en0 || []), ...(interfaces.en1 || [])].find(
      (item) => item.family === 'IPv4' && !item.internal,
    )?.address;
    const onLocalhost = /^localhost(?::|$)|^127\.0\.0\.1(?::|$)/.test(requestHost);
    const base =
      publicUrl ||
      (onLocalhost && localAddress
        ? `http://${localAddress}:${req.socket.localPort}`
        : `${req.protocol}://${requestHost}`);
    const url = `${base.replace(/\/$/, '')}/connect/${event.id}`;
    res.json({
      url,
      image: await QRCode.toDataURL(url, {
        width: 600,
        margin: 2,
        color: { dark: '#171a24', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      }),
      localOnly: /localhost|127\.0\.0\.1/.test(base),
    });
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Route not found.' }));
  app.use((err, _req, res, _next) => {
    if (err instanceof z.ZodError)
      return res
        .status(400)
        .json({ error: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
    if (err instanceof multer.MulterError)
      return res.status(400).json({
        error:
          err.code === 'LIMIT_FILE_SIZE'
            ? 'Files must be 8 MB or smaller.'
            : 'Upload could not be accepted.',
      });
    if (err.type === 'entity.too.large')
      return res.status(413).json({ error: 'This request is too large.' });
    if (err instanceof SyntaxError && 'body' in err)
      return res.status(400).json({ error: 'Invalid request.' });
    console.error('Request failed:', err.name);
    res
      .status(500)
      .json({ error: 'Something went wrong. Your previous changes are safe. Please try again.' });
  });
  return { app, db };
}
