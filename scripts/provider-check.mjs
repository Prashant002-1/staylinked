// Explicitly opt in with npm run provider:check. Sends fictional fixture data,
// keeps credentials server-side, and never prints provider response bodies.
import { openDatabase, seedDemo, parse } from '../server/db.mjs';
import { buildBrief, sourcesFor } from '../server/briefs.mjs';

if (!process.env.OPENCODE_API_KEY) {
  console.error('Add OPENCODE_API_KEY to your ignored .env before checking the provider.');
  process.exitCode = 1;
} else {
  const db = openDatabase(':memory:');
  seedDemo(db);
  const profile = parse(db.prepare('SELECT data FROM users WHERE id=?').get('aisha-demo'));
  const connection = parse(
    db.prepare('SELECT data FROM connections WHERE id=?').get('connection-aisha-demo'),
  );
  const role = parse(db.prepare('SELECT data FROM roles WHERE id=?').get('product-engineer'));
  const materials = db
    .prepare('SELECT data FROM materials WHERE candidate_id=?')
    .all(profile.id)
    .map(parse);
  const model = process.env.OPENCODE_MODEL || 'glm-5.3';
  let requests = 0;
  let responseMetadata;
  const input = {
    profile,
    connection,
    role,
    sources: sourcesFor(profile, connection, materials),
    db,
    config: {
      apiKey: process.env.OPENCODE_API_KEY,
      baseUrl: process.env.OPENCODE_BASE_URL || 'https://opencode.ai/zen/go/v1',
      model,
    },
    fetchImpl: async (...args) => {
      requests++;
      const response = await fetch(...args);
      responseMetadata = { status: response.status };
      if (response.ok) {
        const body = await response
          .clone()
          .json()
          .catch(() => null);
        responseMetadata.finishReason = body?.choices?.[0]?.finish_reason;
        responseMetadata.hasContent = Boolean(body?.choices?.[0]?.message?.content);
      }
      return response;
    },
  };
  try {
    const started = performance.now();
    const result = await buildBrief(input);
    const elapsedMs = Math.round(performance.now() - started);
    const cached = result.mode === 'ai' ? await buildBrief(input) : null;
    console.log(
      JSON.stringify(
        {
          model,
          mode: result.mode,
          elapsedMs,
          quotedFindings: result.findings.filter((finding) => finding.quote).length,
          cacheVerified: Boolean(cached?.cached && requests === 1),
          requests,
          provider: responseMetadata,
          fallback: Boolean(result.fallback),
          fallbackReason: result.fallbackReason,
        },
        null,
        2,
      ),
    );
    if (result.mode !== 'ai' || !cached?.cached || requests !== 1) process.exitCode = 1;
  } finally {
    db.close();
  }
}
