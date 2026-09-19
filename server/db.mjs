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
    CREATE TABLE IF NOT EXISTS briefs (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS connections_recruiter ON connections(recruiter_id);
    CREATE INDEX IF NOT EXISTS materials_candidate ON materials(candidate_id);`);
  return db;
}
export function seedDemo(db) {
  if (db.prepare('SELECT id FROM users WHERE id=?').get('recruiter-demo')) return;
  const password = hashPassword(randomBytes(32).toString('hex'));
  const recruiter = {
    id: 'recruiter-demo',
    kind: 'recruiter',
    name: 'Maya Chen',
    email: 'maya@helix.example',
    company: 'Helix Bio',
    headline: 'Talent partner',
    bio: '',
    links: [],
  };
  const userInsert = db.prepare('INSERT INTO users VALUES (?,?,?,?,?)');
  userInsert.run(
    recruiter.id,
    recruiter.email,
    password,
    recruiter.kind,
    JSON.stringify(recruiter),
  );
  const events = [
    {
      id: 'nyu-science-fair',
      name: 'NYU Science & Technology Fair',
      location: 'Brooklyn, New York',
      date: '2026-09-18',
      prompt: 'What did we talk about? Share the detail you would like me to remember.',
      recruiterId: recruiter.id,
    },
    {
      id: 'biotech-meetup',
      name: 'New York Biotech Meetup',
      location: 'Manhattan, New York',
      date: '2026-08-27',
      prompt: 'What did we talk about? Share the detail you would like me to remember.',
      recruiterId: recruiter.id,
    },
  ];
  for (const event of events)
    db.prepare('INSERT INTO events VALUES (?,?,?)').run(
      event.id,
      recruiter.id,
      JSON.stringify(event),
    );
  const candidates = [
    {
      id: 'aisha-demo',
      name: 'Aisha Patel',
      email: 'aisha@example.com',
      headline: 'Bioengineering researcher · NYU',
      location: 'Brooklyn, NY',
      tags: ['CRISPR', 'Cell culture', 'Research'],
      bio: 'Bioengineering graduate researcher at NYU. I study CRISPR-Cas9 delivery in mammalian cells and care about making experimental work reproducible. I am looking for a hands-on research role where careful bench work matters.',
      conversation:
        'We talked about my CRISPR-Cas9 delivery project and how I troubleshot low editing efficiency. You mentioned Helix is building a new gene-editing team. I would love to bring the same careful approach to your lab.',
      highlight: 'Troubleshooting CRISPR delivery in mammalian cells',
      materialTitle: 'CRISPR-Cas9 delivery · research overview',
      materialText:
        'CRISPR-Cas9 delivery project, NYU Bioengineering\nI compared three delivery conditions in HEK293T mammalian cell culture. I designed guide RNA controls, performed DNA extraction and PCR, and documented each experiment in an electronic lab notebook.\nWhen early experiments showed inconsistent editing, I tracked cell passage number and reagent timing. Repeating experiments with controlled passage numbers improved reproducibility.\nI analyzed flow cytometry readouts and used Python to visualize editing outcomes. This was a supervised research project, not a clinical study.',
      date: '2026-09-18T15:42:00.000Z',
      remembered: true,
      saved: true,
    },
    {
      id: 'daniel-demo',
      name: 'Daniel Park',
      email: 'daniel@example.com',
      headline: 'Research assistant · Columbia',
      location: 'New York, NY',
      tags: ['PCR', 'Molecular biology'],
      bio: 'Research assistant in molecular biology. I work with DNA extraction, PCR assay validation, and careful sample tracking. Seeking a lab technician role in a collaborative research team.',
      conversation:
        'We spoke about preventing sample mix-ups when running large PCR batches. I showed you the sample tracking template our lab uses every day.',
      highlight: 'A practical fix for sample tracking',
      materialTitle: 'Molecular biology lab experience',
      materialText:
        'At Columbia, I prepare DNA extraction batches and run PCR with positive and negative controls. I maintain sample tracking sheets and record deviations in the lab notebook. I train new assistants on contamination prevention. I have not worked directly on CRISPR editing.',
      date: '2026-09-18T16:10:00.000Z',
      remembered: true,
      saved: false,
    },
    {
      id: 'sofia-demo',
      name: 'Sofia Ramirez',
      email: 'sofia@example.com',
      headline: 'Biomedical engineering · NYU',
      location: 'Jersey City, NJ',
      tags: ['Cell culture', 'Microscopy'],
      bio: 'Biomedical engineering student focused on tissue models and microscopy. I enjoy translating complex protocols into repeatable experiments.',
      conversation:
        'We discussed the cell imaging setup from my senior project, especially how we made the experiment easier for the next student to reproduce.',
      highlight: 'Making cell imaging reproducible',
      materialTitle: 'Tissue model capstone',
      materialText:
        'I maintained mammalian cell culture for a tissue model capstone and collected fluorescence microscopy images. I wrote standard operating procedures, recorded experiments in a lab notebook, and analyzed images with ImageJ. The project was supervised by a faculty advisor.',
      date: '2026-09-18T17:05:00.000Z',
      remembered: false,
      saved: false,
    },
    {
      id: 'jun-demo',
      name: 'Jun Kim',
      email: 'jun@example.com',
      headline: 'Software engineer · NYU',
      location: 'Brooklyn, NY',
      tags: ['Python', 'React', 'Data pipelines'],
      bio: 'Software engineer building tools for research teams. My work spans Python data pipelines, SQL, TypeScript and React interfaces.',
      conversation:
        'We talked about how researchers lose time cleaning instrument exports. I built a small data pipeline that makes those exports usable without a spreadsheet cleanup ritual.',
      highlight: 'Turning instrument exports into usable data',
      materialTitle: 'Lab data pipeline · project notes',
      materialText:
        'I built a Python pipeline for validating and cleaning instrument exports. Data is stored in PostgreSQL using SQL migrations and surfaced in a React and TypeScript interface. I wrote unit tests for malformed CSV inputs and documented deployment using Docker. This was a student project with synthetic data.',
      date: '2026-09-18T17:32:00.000Z',
      remembered: true,
      saved: false,
    },
    {
      id: 'marcus-demo',
      name: 'Marcus Reed',
      email: 'marcus@example.com',
      headline: 'Biology graduate · Rutgers',
      location: 'Newark, NJ',
      tags: ['Lab operations', 'DNA extraction'],
      bio: 'Biology graduate with experience keeping a teaching laboratory organized, safe, and ready for experiments.',
      conversation:
        'We talked about the unglamorous parts of good science: keeping inventory accurate and making sure everyone can find the right protocol.',
      highlight: 'The systems behind a well-run lab',
      materialTitle: 'Teaching lab operations',
      materialText:
        'I maintained reagent inventory, prepared buffers, and assisted students with DNA extraction and PCR. I followed written safety protocols and kept accurate lab notebook entries for preparation batches. I am interested in learning cell culture.',
      date: '2026-08-27T18:20:00.000Z',
      remembered: true,
      saved: true,
    },
    {
      id: 'emma-demo',
      name: 'Emma Wilson',
      email: 'emma@example.com',
      headline: 'Data scientist · Cornell',
      location: 'New York, NY',
      tags: ['Python', 'Genomics', 'SQL'],
      bio: 'Data scientist interested in genomics. I use Python and SQL to make research datasets easier to inspect and reproduce.',
      conversation:
        'We compared notes on communicating uncertainty in research results. I shared the genomics visualization tool I made for my thesis.',
      highlight: 'Making genomics results easier to understand',
      materialTitle: 'Genomics visualization thesis',
      materialText:
        'My thesis uses Python, pandas and SQL to process public genomics datasets. I built a reproducible data pipeline, wrote automated tests for data quality, and developed an interactive visualization. I worked with public sequencing data rather than collecting samples at the bench.',
      date: '2026-08-27T19:15:00.000Z',
      remembered: false,
      saved: false,
    },
  ];
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
    const conn = {
      id: `connection-${c.id}`,
      candidateId: c.id,
      recruiterId: recruiter.id,
      eventId: event.id,
      conversation: c.conversation,
      originalConversation: c.conversation,
      highlight: c.highlight,
      interest: 'Research and engineering opportunities',
      createdAt: c.date,
      updatedAt: c.date,
      remembered: c.remembered,
      saved: c.saved,
    };
    db.prepare('INSERT INTO connections VALUES (?,?,?,?,?)').run(
      conn.id,
      c.id,
      recruiter.id,
      event.id,
      JSON.stringify(conn),
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
  const roles = [
    {
      id: 'lab-technician',
      title: 'Research Lab Technician',
      team: 'Gene editing · New York',
      description:
        'Help our gene-editing research team run careful, reproducible experiments. Work with mammalian cells, support CRISPR workflows, and keep clear experimental records.',
      requirements: [
        'CRISPR',
        'Mammalian cell culture',
        'DNA extraction and PCR',
        'Lab notebook and reproducibility',
      ],
    },
    {
      id: 'research-engineer',
      title: 'Research Software Engineer',
      team: 'Research systems · New York',
      description:
        'Build software that helps researchers work with instrument data. Create reliable pipelines and usable internal interfaces.',
      requirements: ['Python data pipelines', 'SQL', 'React and TypeScript', 'Automated tests'],
    },
  ];
  for (const role of roles)
    db.prepare('INSERT INTO roles VALUES (?,?,?)').run(
      role.id,
      recruiter.id,
      JSON.stringify({ ...role, recruiterId: recruiter.id }),
    );
}
