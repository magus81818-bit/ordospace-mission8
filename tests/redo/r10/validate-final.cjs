const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const root = path.resolve(__dirname, '..', '..', '..');
const sourceRepo =
  'C:\\Users\\Admin\\Desktop\\K-디지털\\수업자료\\코덱스\\ORDOSPACE_rebuild';
const deployedCommit = '825b4c77b7c09f0fc3abc3c8cbba419eab50d007';
const approvedRound9 = '67dc87679d77e85b98a5cce85cf3e4c388f609ae';
const sourceHead = 'ea1dc111440207608401c529b5bc27ebc5e61fd7';
const allowedPrefixes = [
  'artifacts/redo/r10/',
  'docs/redo/r10/',
  'evidence/redo/r10/',
  'references/prompts/round-10.md',
  'tests/redo/r10/'
];

function git(args, cwd = root) {
  return cp.execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  }).trim();
}

function gitRaw(args, cwd = root) {
  return cp.execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  }).trimEnd();
}

function json(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

const failures = [];
function check(condition, message) {
  if (!condition) failures.push(message);
}

const premerge = json('artifacts/redo/r10/premerge-gate.json');
const integration = json('artifacts/redo/r10/main-integration.json');
const postmerge = json('artifacts/redo/r10/postmerge-verification.json');
const deployment = json('artifacts/redo/r10/production-deployment.json');
const smoke = json('artifacts/redo/r10/production-smoke.json');
const health = json('artifacts/redo/r10/production-browser-health.json');
const parity = json('artifacts/redo/r10/production-parity.json');
const manifest = json('artifacts/redo/r10/release-manifest.json');
const gate = json('artifacts/redo/r10/final-acceptance-gate.json');
const verification = json('artifacts/redo/r10/verification-summary.json');
const security = json('artifacts/redo/r10/security-secret-audit.json');
const source = json('artifacts/redo/r10/source-repository-integrity.json');
const inventory = json('artifacts/redo/r10/final-inventory-gate.json');
const states = json('artifacts/redo/r10/final-state-gate.json');

check(premerge.pass === true, 'premerge gate failed');
check(integration.pass === true, 'main integration failed');
check(postmerge.pass === true, 'postmerge verification failed');
check(deployment.deployment.status === 'READY', 'deployment is not READY');
check(
  deployment.deployment.projectName === 'ordospace-rebuild',
  'wrong Vercel project'
);
check(
  deployment.deployment.aliases.includes('https://ordospace-rebuild.vercel.app/'),
  'production alias missing'
);
check(
  deployment.source.repository.endsWith('/ordospace-ui-rebuild') &&
    deployment.source.branch === 'main' &&
    deployment.source.commit === deployedCommit,
  'deployed source metadata mismatch'
);
check(smoke.pass === true, 'production smoke failed');
check(smoke.public.cases.length === 12, 'public case count mismatch');
check(smoke.authenticated.cases.length === 20, 'authenticated case count mismatch');
check(smoke.shared.cases.length === 10, 'shared case count mismatch');
check(smoke.interactions.cases.length === 3, 'interaction case count mismatch');
check(health.pass === true, 'production browser health failed');
check(health.consoleErrors.length === 0, 'production console errors found');
check(health.pageErrors.length === 0, 'production page errors found');
check(health.newRequestFailures.length === 0, 'new request failures found');
check(health.httpFailures.length === 0, 'HTTP failures found');
check(health.blockedWriteRequests.length === 0, 'write request attempted');
check(health.unhandledRejections.length === 0, 'unhandled rejection found');
check(parity.pass === true && parity.filesCompared === 16, 'production parity failed');
check(manifest.pass === true, 'release manifest failed');
check(manifest.productPolicy.productChangesInRound10.length === 0, 'product changed in Round 10');
check(manifest.productPolicy.suitFontApplied === false, 'SUIT font was applied');
check(gate.pass === true && gate.failures.length === 0, 'final acceptance gate failed');
check(verification.pass === true, 'final verification summary failed');
check(security.pass === true, 'security or secret scan failed');
check(source.pass === true, 'source repository integrity artifact failed');
check(inventory.pass === true && inventory.total === 73, 'inventory gate mismatch');
check(
  states.pass === true &&
    states.implemented === 528 &&
    states.notApplicable === 675,
  'state gate mismatch'
);

const currentHead = git(['rev-parse', 'HEAD']);
check(
  git(['merge-base', deployedCommit, currentHead]) === deployedCommit,
  'deployed commit is not an ancestor of current evidence head'
);
check(
  git(['merge-base', approvedRound9, currentHead]) === approvedRound9,
  'approved Round 9 is not an ancestor'
);
const sourceCurrent = git(['rev-parse', 'HEAD'], sourceRepo);
const sourceStatus = git(['status', '--porcelain=v1'], sourceRepo);
check(sourceCurrent === sourceHead, 'original source HEAD changed');
check(sourceStatus === '', 'original source worktree is dirty');
check(
  git(['remote', 'get-url', 'origin'], sourceRepo) ===
    'https://github.com/magus81818-bit/ordospace-rebuild.git',
  'original source remote changed'
);

const changed = git([
  'diff',
  '--name-only',
  deployedCommit,
  currentHead
]).split(/\r?\n/).filter(Boolean);
const pending = gitRaw([
  'status',
  '--porcelain=v1',
  '--untracked-files=all'
]).split(/\r?\n/).filter(Boolean).map(line => line.slice(3).replaceAll('\\', '/'));
const releaseOnly = [...changed, ...pending].every(file =>
  allowedPrefixes.some(prefix =>
    prefix.endsWith('/') ? file.startsWith(prefix) : file === prefix
  )
);
check(releaseOnly, 'non-Round-10 evidence path changed after deployment');

const result = {
  generatedAt: new Date().toISOString(),
  deployedCommit,
  currentEvidenceHead: currentHead,
  checks: 36,
  changedAfterDeployment: changed,
  pending,
  failures,
  pass: failures.length === 0
};
if (process.env.R10_VALIDATE_NO_WRITE !== '1') {
  fs.writeFileSync(
    path.join(root, 'artifacts', 'redo', 'r10', 'final-validation.json'),
    `${JSON.stringify(result, null, 2)}\n`
  );
}
console.log(JSON.stringify(result, null, 2));
if (!result.pass) process.exitCode = 1;
