import { mkdir, writeFile } from 'node:fs/promises';
import { Avatar, Style } from '@dicebear/core';
import definition from '@dicebear/styles/notionists.json' with { type: 'json' };

// Build-time placeholders. No avatar library or third-party image requests in the client.
const style = new Style(definition);
const folder = new URL('../public/avatars/', import.meta.url);
await mkdir(folder, { recursive: true });
const colors = ['e9e4f1', 'e2ece7', 'f1e8df', 'e1e9ef', 'eee2e7', 'e9e9df'];
for (let i = 0; i < 32; i++) {
  const svg = new Avatar(style, {
    seed: `again-person-${i}`,
    size: 128,
    idRandomization: false,
    scale: 1.25,
    backgroundColor: colors[i % colors.length],
    gestureProbability: 0,
  }).toString();
  await writeFile(new URL(`person-${i}.svg`, folder), svg);
}
