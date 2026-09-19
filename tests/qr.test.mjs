import test from 'node:test';
import assert from 'node:assert/strict';
import { eventFromCode } from '../src/lib/qr.ts';

test('QR invitations accept LAN, production, and local paths with safe event IDs', () => {
  const invitations = [
    ['http://10.0.0.2:5173/connect/nyu-tech-fair', 'nyu-tech-fair'],
    ['http://localhost:5173/connect/event_123', 'event_123'],
    ['https://staylinked.example/connect/ABcd-12_34', 'ABcd-12_34'],
    ['/connect/event-123', 'event-123'],
    ['/connect/event-123/', 'event-123'],
    ['  /connect/event-123  ', 'event-123'],
  ];
  for (const [input, expected] of invitations) assert.equal(eventFromCode(input), expected, input);
});

test('QR parsing returns only the event ID, never the scanned host or redirect parameters', () => {
  assert.equal(
    eventFromCode(
      'https://untrusted.example/connect/known-event?redirect=https://other.example#next',
    ),
    'known-event',
  );
});

test('QR invitations reject executable, non-web, ambiguous, and plain-text input', () => {
  for (const input of [
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'file:///connect/event',
    'ftp://example.com/connect/event',
    'mailto:recruiter@example.com',
    '//example.com/connect/event',
    'example.com/connect/event',
    'event-123',
    '',
  ])
    assert.equal(eventFromCode(input), null, input);
});

test('QR invitations reject URLs containing credentials', () => {
  for (const input of [
    'https://user@example.com/connect/event',
    'https://user:password@example.com/connect/event',
    'https://:password@example.com/connect/event',
    'https://%75ser@example.com/connect/event',
  ])
    assert.equal(eventFromCode(input), null, input);
});

test('QR invitations reject unrelated routes, nested paths, and unsafe event identifiers', () => {
  for (const input of [
    'https://example.com/profile',
    'https://example.com/connect/',
    'https://example.com/connect/event/nested',
    'https://example.com/prefix/connect/event',
    '/connect/event/nested',
    '/connect/../profile',
    '/connect/event.name',
    '/connect/café',
    '/connect/event name',
  ])
    assert.equal(eventFromCode(input), null, input);
});

test('QR invitations reject encoded slashes, traversal, and encoded identifiers', () => {
  for (const input of [
    'https://example.com/connect/event%2Fother',
    'https://example.com/connect/event%5Cother',
    'https://example.com/connect/%2e%2e',
    '/connect/event%2fother',
    '/connect/event%252Fother',
    '/connect/%2e%2e',
    '/connect/%65vent',
  ])
    assert.equal(eventFromCode(input), null, input);
});

test('QR invitations enforce payload and event-ID bounds before resolution', () => {
  assert.equal(eventFromCode(`/connect/${'a'.repeat(180)}`), 'a'.repeat(180));
  assert.equal(eventFromCode(`/connect/${'a'.repeat(181)}`), null);
  assert.equal(eventFromCode('x'.repeat(4097)), null);
  assert.equal(eventFromCode(`${' '.repeat(4096)}/connect/event`), null);
  assert.equal(
    eventFromCode(`https://example.com/connect/event?padding=${'x'.repeat(4096)}`),
    null,
  );
});
