import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const binary = fileURLToPath(
  new URL(
    `../target/release/staylinked-evidence${process.platform === 'win32' ? '.exe' : ''}`,
    import.meta.url,
  ),
);

// One bounded, asynchronous process per selected person's role view. No shell,
// service, index, or database to operate. This does not block Node's event loop.
export async function retrieveEvidence(requirements, sources) {
  const input = JSON.stringify({
    requirements,
    sources: sources.map(({ id, text }) => ({ id, text })),
  });
  if (Buffer.byteLength(input) > 2_000_000) throw new Error('Evidence input is too large.');
  return new Promise((resolve, reject) => {
    const child = execFile(
      binary,
      [],
      { timeout: 3000, maxBuffer: 1_000_000, windowsHide: true },
      (error, stdout) => {
        if (error) {
          reject(
            new Error(
              error.code === 'ENOENT'
                ? 'Build the evidence engine with npm run rust:build.'
                : 'Evidence lookup could not complete.',
            ),
          );
          return;
        }
        try {
          const result = JSON.parse(stdout);
          // Verify the process boundary, even though the engine is owned code.
          if (!Array.isArray(result.findings) || result.findings.length !== requirements.length)
            throw new Error('Invalid findings');
          result.findings.forEach((finding, i) => {
            if (finding.requirement !== requirements[i]) throw new Error('Unexpected requirement');
            if (finding.sourceId === null && finding.quote === null) return;
            const source = sources.find((s) => s.id === finding.sourceId);
            if (
              !source ||
              typeof finding.quote !== 'string' ||
              !finding.quote ||
              !source.text.includes(finding.quote)
            )
              throw new Error('Invalid evidence citation');
          });
          resolve(result);
        } catch {
          reject(new Error('Evidence lookup returned an invalid result.'));
        }
      },
    );
    child.stdin.on('error', () => {}); // execFile's callback owns process failures, including EPIPE.
    child.stdin.end(input);
  });
}
