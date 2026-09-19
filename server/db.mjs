import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const uid = () => randomBytes(12).toString('hex');
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function checkPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const parse = (row) => (row ? JSON.parse(row.data) : null);
export function openDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, kind TEXT NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, recruiter_id TEXT REFERENCES users(id), data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS connections (id TEXT PRIMARY KEY, candidate_id TEXT REFERENCES users(id), recruiter_id TEXT REFERENCES users(id), event_id TEXT REFERENCES events(id), data TEXT NOT NULL, UNIQUE(candidate_id,event_id));
    CREATE TABLE IF NOT EXISTS materials (id TEXT PRIMARY KEY, candidate_id TEXT REFERENCES users(id), data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, recruiter_id TEXT REFERENCES users(id), data TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS connections_candidate ON connections(candidate_id);
    CREATE TABLE IF NOT EXISTS briefs (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS connections_recruiter ON connections(recruiter_id);
    CREATE INDEX IF NOT EXISTS materials_candidate ON materials(candidate_id);`);
  return db;
}
export function seedDemo(db) {
  // Existing installations keep their people and conversations untouched.
  if (db.prepare('SELECT id FROM users WHERE id=?').get('recruiter-demo')) return;
  const password = hashPassword(randomBytes(32).toString('hex'));
  const recruiter = {
    id: 'recruiter-demo',
    kind: 'recruiter',
    name: 'Maya Chen',
    email: 'maya@northstar.example',
    company: 'Northstar',
    headline: 'Building the team at Northstar',
    location: 'Brooklyn, NY',
    bio: 'I help a small product team find thoughtful engineers and designers. Northstar makes planning tools for teams doing complicated work. Usually asking what you built, what broke, and what you learned. Outside work: ceramics, long walks, and ambitious cooking projects.',
    tags: ['Product teams', 'Engineering', 'Design'],
    links: [],
  };
  const events = [
    {
      id: 'nyu-tech-fair',
      name: 'NYU Tech & Design Fair',
      location: 'Brooklyn, New York',
      date: '2026-09-18',
      prompt: 'What did we talk about? Share the detail you would like me to remember.',
      recruiterId: recruiter.id,
    },
    {
      id: 'nyc-builder-meetup',
      name: 'NYC Builders Meetup',
      location: 'Manhattan, New York',
      date: '2026-08-27',
      prompt: 'What did we talk about? Share the detail you would like me to remember.',
      recruiterId: recruiter.id,
    },
  ];
  const candidates = [
    {
      id: 'aisha-demo',
      name: 'Aisha Patel',
      email: 'aisha@example.com',
      headline: 'Frontend engineer · building for the everyday',
      location: 'Brooklyn, NY',
      tags: ['React', 'TypeScript', 'Accessibility'],
      bio: 'I build interfaces that stay useful when the network does not. My final project at NYU was a shared trip planner with offline editing. I like the space between thoughtful interaction design and the messy details of getting software to work for people.',
      conversation:
        'We talked about the offline trip planner I built with two friends, especially the edit conflicts when someone changes a plan on the subway. You said Northstar is working through similar questions around collaborative editing. I showed you the merge preview that lets people choose what to keep.',
      highlight: 'The trip planner that still works on the subway',
      interest: 'Frontend and product engineering',
      materialTitle: 'Wayfinder · building an offline trip planner',
      materialText:
        'Wayfinder is a shared trip planner I built with two classmates at NYU. I owned the React and TypeScript interface, local persistence in IndexedDB, and keyboard navigation.\nI built an offline editing queue and a merge preview that shows conflicting changes before they overwrite a plan. We chose explicit conflict resolution over silently using the most recent edit.\nI wrote automated tests for reconnecting after an interrupted sync, duplicate requests, and two people editing the same stop. Five classmates used the prototype during a weekend trip. Their feedback led us to replace an ambiguous sync icon with plain language.\nThe project uses a small Node API and SQLite. It is a student prototype, with no claim of production scale.',
      date: '2026-09-18T15:42:00.000Z',
    },
    {
      id: 'daniel-demo',
      name: 'Daniel Park',
      email: 'daniel@example.com',
      headline: 'Backend engineer · reliable little systems',
      location: 'New York, NY',
      tags: ['Go', 'PostgreSQL', 'APIs'],
      bio: 'Recent Columbia graduate. I enjoy working through what happens when a request arrives twice, a worker disappears, or an API takes too long. Currently building a small invoicing tool for my family’s print shop.',
      conversation:
        'We ended up talking about the invoice that was sent twice. I walked you through the idempotency keys I added to my family’s print shop tool, and how I tested retries without actually charging anyone.',
      highlight: 'The invoice that should never send twice',
      interest: 'Backend engineering',
      materialTitle: 'Print shop invoices · retries without duplicates',
      materialText:
        'I built a Go API with PostgreSQL for my family’s print shop to track draft invoices and payments. I added idempotency keys and database constraints so retrying the same request does not create duplicate invoices.\nI wrote integration tests for concurrent requests, timeouts, and transaction rollback. Payment integration used a provider sandbox and test cards. I have not operated a production payment service.\nA simple task queue retries email delivery with backoff. A human reviews each invoice before it is sent.',
      date: '2026-09-18T16:10:00.000Z',
    },
    {
      id: 'sofia-demo',
      name: 'Sofia Ramirez',
      email: 'sofia@example.com',
      headline: 'Product designer · useful, accessible things',
      location: 'Jersey City, NJ',
      tags: ['Interaction design', 'Accessibility', 'Prototyping'],
      bio: 'I design tools that make complicated tasks feel approachable. At NYU I worked with student volunteers to improve a community pantry booking flow. I prototype in Figma and code, and care about what happens after the happy path.',
      conversation:
        'We tried the pantry booking prototype together. You noticed how the form remembered what someone entered after an error. We talked about designing recovery states with as much care as the first screen.',
      highlight: 'A booking form that does not make you start over',
      interest: 'Product design and design engineering',
      materialTitle: 'Community pantry · a kinder booking flow',
      materialText:
        'I redesigned a community pantry booking prototype after observing six volunteer sessions. The original form cleared entries after validation errors. My prototype preserves each field and explains errors beside the relevant control.\nI documented keyboard navigation, focus order, and screen reader labels. I tested a React prototype with two keyboard-only participants and iterated on its focus handling.\nThis was a student-led design study with a small sample. The pantry has not deployed the prototype.',
      date: '2026-09-18T17:05:00.000Z',
    },
    {
      id: 'jun-demo',
      name: 'Jun Kim',
      email: 'jun@example.com',
      headline: 'Full-stack engineer · taming messy data',
      location: 'Brooklyn, NY',
      tags: ['Python', 'React', 'Data pipelines'],
      bio: 'I turn messy spreadsheets into tools people can actually use. My latest project is a data importer that tells you what is wrong before anything reaches the database. Looking for a small team where I can work across the stack.',
      conversation:
        'We talked about the CSV import that kept breaking my student club’s directory. I showed you the preview screen that catches bad rows before the import starts. You mentioned similar onboarding friction for Northstar customers.',
      highlight: 'Making a messy CSV feel manageable',
      interest: 'Full-stack and data engineering',
      materialTitle: 'Clearfile · a friendlier CSV import',
      materialText:
        'I built a Python data pipeline for validating and cleaning CSV imports. The importer checks required columns, inconsistent dates, duplicate rows, and invalid email addresses before saving anything.\nData is stored in PostgreSQL using SQL migrations and surfaced in a React and TypeScript interface. I wrote automated tests for malformed CSV inputs, quoted newlines, Unicode, and retrying an interrupted import.\nI documented deployment using Docker and tested with synthetic data and a consented student club directory. The interface shows a preview and lets people download rejected rows with an explanation.',
      date: '2026-09-18T17:32:00.000Z',
    },
    {
      id: 'marcus-demo',
      name: 'Marcus Reed',
      email: 'marcus@example.com',
      headline: 'Infrastructure engineer · fewer 2 a.m. surprises',
      location: 'Newark, NJ',
      tags: ['Linux', 'Docker', 'Observability'],
      bio: 'Rutgers CS graduate with a soft spot for readable runbooks. I maintain a small community server and build tools that make deployment and recovery less stressful. I like being able to explain every moving part.',
      conversation:
        'We compared our worst deployment stories. Mine ended with a disk full of logs. I showed you the small dashboard and recovery checklist I wrote afterward, including a restore drill that actually runs.',
      highlight: 'The deployment story with a real recovery plan',
      interest: 'Infrastructure and platform engineering',
      materialTitle: 'Community server · practicing recovery',
      materialText:
        'I maintain a Linux server for a small community group. I containerized two services with Docker, configured daily database backups, and added disk usage and service health alerts.\nAfter a full disk caused an outage, I added log rotation and documented a recovery checklist. I run a monthly restore drill into a separate environment and check the restored data.\nThe system serves fewer than 100 members. I have not managed a large Kubernetes cluster.',
      date: '2026-08-27T18:20:00.000Z',
    },
    {
      id: 'emma-demo',
      name: 'Emma Wilson',
      email: 'emma@example.com',
      headline: 'Data analyst · asking better product questions',
      location: 'New York, NY',
      tags: ['Python', 'SQL', 'Product analytics'],
      bio: 'Cornell graduate interested in how people use products. I use SQL and Python to investigate confusing metrics, document assumptions, and make uncertainty visible. Recently built a small experiment analysis notebook.',
      conversation:
        'We talked about a signup metric that looked better only because the tracking changed. I shared the checks I now run before interpreting an experiment, and you told me about Northstar’s onboarding questions.',
      highlight: 'The signup metric that needed a second look',
      interest: 'Product analytics and data engineering',
      materialTitle: 'Experiment notebook · checking the measurement first',
      materialText:
        'I used Python and SQL to analyze a synthetic onboarding experiment for my capstone. I built a reproducible data pipeline and wrote automated tests for duplicate events, missing timestamps, and changes in event definitions.\nMy notebook reports confidence intervals and separates exploratory analysis from the prespecified metric. I added a sample ratio mismatch check before any treatment comparison.\nThe data is synthetic. The analysis demonstrates a method, not a real product conversion improvement.',
      date: '2026-08-27T19:15:00.000Z',
    },
  ];
  const roles = [
    {
      id: 'product-engineer',
      title: 'Product Engineer',
      team: 'Collaboration · New York',
      description:
        'Build thoughtful interfaces for teams planning work together. Work across interaction design, frontend implementation, and reliable offline behavior.',
      requirements: ['React and TypeScript', 'Accessibility', 'Offline editing', 'Automated tests'],
    },
    {
      id: 'data-engineer',
      title: 'Data Engineer',
      team: 'Product foundations · New York',
      description:
        'Make customer data easier to import and trust. Build reliable validation pipelines and readable tools for understanding bad inputs.',
      requirements: ['Python data pipelines', 'SQL', 'CSV validation', 'Automated tests'],
    },
  ];
  db.exec('BEGIN');
  try {
    const userInsert = db.prepare('INSERT INTO users VALUES (?,?,?,?,?)');
    userInsert.run(
      recruiter.id,
      recruiter.email,
      password,
      recruiter.kind,
      JSON.stringify(recruiter),
    );
    for (const event of events)
      db.prepare('INSERT INTO events VALUES (?,?,?)').run(
        event.id,
        recruiter.id,
        JSON.stringify(event),
      );
    for (const c of candidates) {
      const profile = {
        id: c.id,
        kind: 'candidate',
        name: c.name,
        email: c.email,
        headline: c.headline,
        location: c.location,
        bio: c.bio,
        tags: c.tags,
        links: [],
        updatedAt: c.date,
      };
      userInsert.run(c.id, c.email, password, 'candidate', JSON.stringify(profile));
      const event = c.date.startsWith('2026-08') ? events[1] : events[0];
      const connection = {
        id: `connection-${c.id}`,
        candidateId: c.id,
        recruiterId: recruiter.id,
        eventId: event.id,
        conversation: c.conversation,
        originalConversation: c.conversation,
        highlight: c.highlight,
        interest: c.interest,
        createdAt: c.date,
        updatedAt: c.date,
      };
      db.prepare('INSERT INTO connections VALUES (?,?,?,?,?)').run(
        connection.id,
        c.id,
        recruiter.id,
        event.id,
        JSON.stringify(connection),
      );
      const material = {
        id: `material-${c.id}`,
        candidateId: c.id,
        title: c.materialTitle,
        type: 'note',
        text: c.materialText,
        createdAt: c.date,
      };
      db.prepare('INSERT INTO materials VALUES (?,?,?)').run(
        material.id,
        c.id,
        JSON.stringify(material),
      );
    }
    for (const role of roles)
      db.prepare('INSERT INTO roles VALUES (?,?,?)').run(
        role.id,
        recruiter.id,
        JSON.stringify({ ...role, recruiterId: recruiter.id }),
      );
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
