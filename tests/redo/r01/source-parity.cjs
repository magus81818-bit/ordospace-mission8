const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const resultRoot = path.resolve(__dirname, '..', '..', '..');
const sourceRoot = process.argv[2];
const sourceCommit = process.argv[3] || 'ea1dc111440207608401c529b5bc27ebc5e61fd7';

if (!sourceRoot) {
  throw new Error('Usage: node source-parity.cjs <protected-source-repo> [source-commit]');
}

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function tree(cwd, revision) {
  const raw = git(cwd, ['ls-tree', '-r', '-z', revision]);
  if (!raw) return [];
  return raw.split('\0').filter(Boolean).map(line => {
    const match = line.match(/^(\d+)\s+(\w+)\s+([0-9a-f]+)\t([\s\S]+)$/);
    if (!match) throw new Error(`Unexpected ls-tree row: ${line}`);
    return { mode: match[1], type: match[2], object: match[3], path: match[4] };
  });
}

const source = tree(sourceRoot, sourceCommit);
const resultCommit = git(resultRoot, ['rev-parse', '937d38b^{commit}']);
const result = tree(resultRoot, resultCommit);
const sourceByPath = new Map(source.map(entry => [entry.path, entry]));
const resultByPath = new Map(result.map(entry => [entry.path, entry]));
const allPaths = [...new Set([...sourceByPath.keys(), ...resultByPath.keys()])].sort();
const differences = [];

for (const filePath of allPaths) {
  const left = sourceByPath.get(filePath) || null;
  const right = resultByPath.get(filePath) || null;
  if (!left || !right || left.mode !== right.mode || left.type !== right.type || left.object !== right.object) {
    differences.push({ path: filePath, source: left, result: right });
  }
}

const artifactRoot = path.join(resultRoot, 'artifacts', 'redo', 'r01');
fs.mkdirSync(artifactRoot, { recursive: true });
fs.writeFileSync(
  path.join(artifactRoot, 'source-file-hashes.json'),
  `${JSON.stringify({ sourceCommit, resultCommit, algorithm: 'git-blob-sha1', files: source }, null, 2)}\n`,
  'utf8'
);
fs.writeFileSync(
  path.join(artifactRoot, 'source-parity-report.json'),
  `${JSON.stringify({
    checkedAt: new Date().toISOString(),
    sourceRoot,
    sourceCommit,
    resultRoot,
    resultCommit,
    sourceEntries: source.length,
    resultEntries: result.length,
    differenceCount: differences.length,
    productParity: differences.length === 0,
    differences
  }, null, 2)}\n`,
  'utf8'
);

console.log(JSON.stringify({ sourceEntries: source.length, resultEntries: result.length, differences: differences.length, productParity: differences.length === 0 }));
if (differences.length) process.exitCode = 1;
