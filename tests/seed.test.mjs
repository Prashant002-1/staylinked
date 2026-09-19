import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase, seedDemo, seedAishaConnections } from '../server/db.mjs';

test('sample applicant has five distinct contacts with Maya as the latest encounter', (t) => {
  const db = openDatabase(':memory:');
  t.after(() => db.close());
  seedDemo(db);
  const connections = db
    .prepare('SELECT data FROM connections WHERE candidate_id=?')
    .all('aisha-demo')
    .map((row) => JSON.parse(row.data));
  assert.equal(connections.length, 5);
  assert.equal(new Set(connections.map((connection) => connection.recruiterId)).size, 5);
  connections.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  assert.equal(connections[0].id, 'connection-aisha-demo');
  assert.equal(connections[0].recruiterId, 'recruiter-demo');
  for (const connection of connections) {
    const person = JSON.parse(
      db.prepare('SELECT data FROM users WHERE id=?').get(connection.recruiterId).data,
    );
    assert.ok(connection.highlight.startsWith(person.name.split(' ')[0]));
    assert.ok(connection.highlight.length >= 80 && connection.highlight.length <= 110);
    assert.match(connection.conversation, /\b(offered to|agreed to|would send)\b/);
    assert.ok(connection.conversation.includes(person.company));
  }
  for (const connection of connections.slice(1)) {
    const person = JSON.parse(
      db.prepare('SELECT data FROM users WHERE id=?').get(connection.recruiterId).data,
    );
    const event = JSON.parse(
      db.prepare('SELECT data FROM events WHERE id=?').get(connection.eventId).data,
    );
    assert.equal(person.kind, 'recruiter');
    assert.match(person.email, /@example\.com$/);
    assert.ok(person.company && person.bio && event.location);
    assert.doesNotMatch(
      `${person.name} ${event.name} ${connection.conversation}`,
      /demo|fictional/i,
    );
    assert.equal(connection.conversation, connection.originalConversation);
    assert.ok(connection.conversation.length > 100);
  }
  assert.equal(new Set(connections.map((connection) => connection.highlight)).size, 5);
});

test('reapplying sample contacts preserves existing profiles and encounter edits without duplicates', (t) => {
  const db = openDatabase(':memory:');
  t.after(() => db.close());
  seedDemo(db);
  const id = 'connection-aisha-elena-morris-sample';
  const edited = JSON.parse(db.prepare('SELECT data FROM connections WHERE id=?').get(id).data);
  edited.conversation = 'I added a thoughtful detail after our conversation at NYU Tandon.';
  db.prepare('UPDATE connections SET data=? WHERE id=?').run(JSON.stringify(edited), id);
  const profile = JSON.parse(
    db.prepare('SELECT data FROM users WHERE id=?').get('aisha-demo').data,
  );
  profile.headline = 'My own updated headline';
  db.prepare('UPDATE users SET data=? WHERE id=?').run(JSON.stringify(profile), profile.id);
  seedAishaConnections(db);
  seedDemo(db);
  assert.deepEqual(
    JSON.parse(db.prepare('SELECT data FROM connections WHERE id=?').get(id).data),
    edited,
  );
  assert.deepEqual(
    JSON.parse(db.prepare('SELECT data FROM users WHERE id=?').get(profile.id).data),
    profile,
  );
  assert.equal(
    db.prepare('SELECT count(*) AS count FROM connections WHERE candidate_id=?').get('aisha-demo')
      .count,
    5,
  );
});
