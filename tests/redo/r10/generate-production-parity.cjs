const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..', '..', '..');
const artifactDir = path.join(root, 'artifacts', 'redo', 'r10');
const baseUrl = 'https://ordospace-rebuild.vercel.app/';
const releaseCommit = '825b4c77b7c09f0fc3abc3c8cbba419eab50d007';
const releaseProductHash =
  'ffb97921f2807d2dc1e16893abfb0aadc4330307c4b142791a6a05f1005d33e8';
const files = [
  'index.html',
  'app/main.js',
  'app/config/app.config.js',
  'app/router/hash-router.js',
  'app/layout/app-shell.js',
  'app/styles/app.css',
  'app/styles/dashboard-salesops.tokens.css',
  'app/styles/dashboard-salesops.primitives.css',
  'app/styles/dashboard-salesops.shell.css',
  'app/styles/dashboard-salesops.admin.css',
  'app/styles/dashboard-salesops.client.css',
  'app/styles/dashboard-salesops.worker.css',
  'app/ui/components/primitives.ui.js',
  'app/ui/components/admin.ui.js',
  'app/ui/components/client.ui.js',
  'app/ui/components/worker.ui.js'
];

function hash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function normalizedText(buffer) {
  return Buffer.from(buffer.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
}

async function main() {
  const cases = [];
  for (const file of files) {
    const local = fs.readFileSync(path.join(root, file));
    const response = await fetch(new URL(file, baseUrl), {
      redirect: 'follow',
      cache: 'no-store'
    });
    const remote = Buffer.from(await response.arrayBuffer());
    const text = /\.(?:html|css|js|json|md)$/i.test(file);
    const comparableLocal = text ? normalizedText(local) : local;
    const comparableRemote = text ? normalizedText(remote) : remote;
    const localSha256 = hash(comparableLocal);
    const remoteSha256 = hash(comparableRemote);
    cases.push({
      file,
      url: new URL(file, baseUrl).toString(),
      status: response.status,
      contentType: response.headers.get('content-type'),
      localBytes: local.length,
      remoteBytes: remote.length,
      normalization: text ? 'CRLF to LF' : 'none',
      localSha256,
      remoteSha256,
      same: localSha256 === remoteSha256,
      pass: response.status === 200 && localSha256 === remoteSha256
    });
  }
  const result = {
    generatedAt: new Date().toISOString(),
    productionUrl: baseUrl,
    releaseCommit,
    releaseProductHash,
    comparisonBasis: 'tracked release files from writable main',
    filesCompared: cases.length,
    cases,
    routeAndRoleParityArtifact: 'artifacts/redo/r10/production-smoke.json',
    browserHealthArtifact: 'artifacts/redo/r10/production-browser-health.json',
    pass: cases.length === files.length && cases.every(item => item.pass)
  };
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactDir, 'production-parity.json'),
    `${JSON.stringify(result, null, 2)}\n`
  );
  console.log(JSON.stringify({
    filesCompared: result.filesCompared,
    mismatches: cases.filter(item => !item.pass).map(item => item.file),
    pass: result.pass
  }, null, 2));
  if (!result.pass) process.exitCode = 1;
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
