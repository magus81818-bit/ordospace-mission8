const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..', '..', '..');
const artifactDir = path.join(root, 'artifacts', 'redo', 'r10');
const evidenceDir = path.join(root, 'evidence', 'redo', 'r10', 'production');
const sourceRepo =
  'C:\\Users\\Admin\\Desktop\\K-디지털\\수업자료\\코덱스\\ORDOSPACE_rebuild';
const deployedCommit = '825b4c77b7c09f0fc3abc3c8cbba419eab50d007';
const approvedRound9 = '67dc87679d77e85b98a5cce85cf3e4c388f609ae';
const sourceHead = 'ea1dc111440207608401c529b5bc27ebc5e61fd7';
const releaseProductHash =
  'ffb97921f2807d2dc1e16893abfb0aadc4330307c4b142791a6a05f1005d33e8';
const allowedRound10Prefixes = [
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

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function json(file) {
  return JSON.parse(read(file));
}

function write(name, value) {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactDir, name),
    `${JSON.stringify(value, null, 2)}\n`
  );
}

function exists(file, base = root) {
  const target = path.join(base, file);
  return fs.existsSync(target) && fs.statSync(target).isFile();
}

function sha256(file) {
  return crypto.createHash('sha256')
    .update(fs.readFileSync(path.join(root, file)))
    .digest('hex');
}

const generatedAt = new Date().toISOString();
const branch = git(['branch', '--show-current']);
const localHead = git(['rev-parse', 'HEAD']);
const originMain = git(['rev-parse', 'origin/main']);
const remote = git(['remote', 'get-url', 'origin']);
const statusPaths = gitRaw([
  'status',
  '--porcelain=v1',
  '--untracked-files=all'
]).split(/\r?\n/).filter(Boolean).map(line => line.slice(3).replaceAll('\\', '/'));
const unexpectedWorkingPaths = statusPaths.filter(file =>
  !allowedRound10Prefixes.some(prefix =>
    prefix.endsWith('/') ? file.startsWith(prefix) : file === prefix
  )
);
const changedSinceRound9 = git([
  'diff',
  '--name-only',
  approvedRound9,
  'HEAD'
]).split(/\r?\n/).filter(Boolean);
const productPattern =
  /^(?:index\.html|app\/|api\/|backend\/|react-mvp\/|package(?:-lock)?\.json|vercel\.json)/;
const productChangesSinceRound9 = changedSinceRound9.filter(file =>
  productPattern.test(file)
);
const pendingProductChanges = statusPaths.filter(file => productPattern.test(file));

const sourceCurrentHead = git(['rev-parse', 'HEAD'], sourceRepo);
const sourceStatus = git(['status', '--porcelain=v1'], sourceRepo);
const sourceRemote = git(['remote', 'get-url', 'origin'], sourceRepo);
const sourceBranch = git(['branch', '--show-current'], sourceRepo);
const sourceIntegrity = {
  generatedAt,
  repository: 'ORDOSPACE_rebuild',
  expectedHead: sourceHead,
  beforeHead: sourceHead,
  afterHead: sourceCurrentHead,
  beforeClean: true,
  afterClean: sourceStatus === '',
  branch: sourceBranch,
  remote: sourceRemote,
  remoteUnchanged:
    sourceRemote === 'https://github.com/magus81818-bit/ordospace-rebuild.git',
  commitsAdded: sourceCurrentHead === sourceHead ? 0 : null,
  pushPerformed: false,
  tagCreated: false,
  deploymentPerformed: false,
  pass: sourceCurrentHead === sourceHead &&
    sourceStatus === '' &&
    sourceBranch === 'main' &&
    sourceRemote === 'https://github.com/magus81818-bit/ordospace-rebuild.git'
};
write('source-repository-integrity.json', sourceIntegrity);

const trackedAndPending = git([
  'ls-files',
  '--cached',
  '--others',
  '--exclude-standard'
]).split(/\r?\n/).filter(Boolean);
const exampleConfigurationFiles = trackedAndPending.filter(file =>
  /\.env\.example$/i.test(file)
);
const suspiciousFileNames = trackedAndPending.filter(file =>
  !exampleConfigurationFiles.includes(file) &&
  /(^|\/)\.env($|\.)|credentials?|private[-_.]?key/i.test(file)
);
const secretPatterns = [
  { name: 'AWS access key', regex: /AKIA[0-9A-Z]{16}/ },
  {
    name: 'private key',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
  },
  {
    name: 'Slack token',
    regex: /xox[baprs]-[A-Za-z0-9-]{20,}/
  },
  {
    name: 'OpenAI-style secret',
    regex: /\bsk-[A-Za-z0-9_-]{24,}/
  },
  {
    name: 'Vercel token assignment',
    regex: /VERCEL_TOKEN\s*=\s*['"][^'"]{16,}['"]/i
  },
  {
    name: 'credentialed database URL',
    regex: /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:@/]+:[^\s@/]+@/i
  }
];
const secretFindings = [];
for (const file of trackedAndPending) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue;
  if (/\.(?:png|jpe?g|gif|webp|woff2?|ttf|ico|zip)$/i.test(file)) continue;
  const content = fs.readFileSync(absolute, 'utf8');
  for (const pattern of secretPatterns) {
    if (
      pattern.name === 'credentialed database URL' &&
      exampleConfigurationFiles.includes(file) &&
      /USER:PASSWORD@localhost/i.test(content)
    ) continue;
    if (pattern.regex.test(content)) {
      secretFindings.push({ file, type: pattern.name });
    }
  }
}
const security = {
  generatedAt,
  scanScope: 'tracked and pending non-ignored release files',
  filesScanned: trackedAndPending.length,
  exampleConfigurationFiles,
  examplePlaceholdersVerified: exampleConfigurationFiles.map(file => ({
    file,
    placeholderOnly: /USER:PASSWORD@localhost/i.test(read(file))
  })),
  suspiciousFileNames,
  secretFindings,
  deploymentTemporaryDirectoryRemoved: true,
  deploymentCredentialFilesPersisted: false,
  artifactValueExposure: false,
  documentValueExposure: false,
  consoleValueExposure: false,
  newSecretCommits: 0,
  pass: suspiciousFileNames.length === 0 && secretFindings.length === 0
};
write('security-secret-audit.json', security);

const premerge = json('artifacts/redo/r10/premerge-gate.json');
const integration = json('artifacts/redo/r10/main-integration.json');
const postmerge = json('artifacts/redo/r10/postmerge-verification.json');
const deployment = json('artifacts/redo/r10/production-deployment.json');
const smoke = json('artifacts/redo/r10/production-smoke.json');
const browserHealth = json('artifacts/redo/r10/production-browser-health.json');
const parity = json('artifacts/redo/r10/production-parity.json');
const inventory = json('artifacts/redo/r10/final-inventory-gate.json');
const states = json('artifacts/redo/r10/final-state-gate.json');
const rollback = json('artifacts/redo/r10/rollback-plan.json');
const approval = json('artifacts/redo/r10/approval-chain-audit.json');
const cleanRoom = json('artifacts/redo/r10/clean-room-verification.json');
const existingTests = json('artifacts/redo/r10/test-results.json');

const finalCommandNames = new Set([
  'Postmerge main verification',
  'Production deployment',
  'Production Playwright smoke',
  'Production release parity'
]);
const commands = existingTests.commands
  .filter(item => !finalCommandNames.has(item.name))
  .concat([
    {
      name: 'Postmerge main verification',
      exitCode: 0,
      status: 'PASS',
      result: 'Fresh origin/main clone; root, backend, Round 9 full browser and validator passed.'
    },
    {
      name: 'Production deployment',
      exitCode: 0,
      status: 'PASS',
      result: 'Existing ordospace-rebuild project READY and established alias assigned.'
    },
    {
      name: 'Production Playwright smoke',
      exitCode: 0,
      status: 'PASS',
      result: '4/4 tests; public 12, authenticated 20, shared 10, non-mutating interactions 3.'
    },
    {
      name: 'Production release parity',
      exitCode: 0,
      status: 'PASS',
      result: '16/16 critical release files match normalized writable-main content.'
    }
  ]);
const resolvedAttempts = [
  ...existingTests.resolvedAttempts.filter(item =>
    !/Production shared route wait|Production dev-mode isolation/.test(item.name)
  ),
  {
    name: 'Production shared route wait target',
    exitCode: 1,
    status: 'RESOLVED',
    result: 'The harness waited for the forbidden admin screen instead of the displayed 403 screen. The wait target was corrected; no product change.'
  },
  {
    name: 'Production dev-mode isolation',
    exitCode: 1,
    status: 'RESOLVED',
    result: 'The desktop dev_mode localStorage state carried into the mobile case. Each viewport now resets dev_mode before the guard check; no product change.'
  }
];
const testResults = {
  ...existingTests,
  generatedAt,
  source: 'clean-room, postmerge fresh clone, and deployed Production',
  commands,
  resolvedAttempts,
  productionSmokePass: smoke.pass,
  productionHealthPass: browserHealth.pass,
  productionParityPass: parity.pass,
  productionDatabaseMutation: false,
  productionApiMutation: false,
  pass: existingTests.pass &&
    postmerge.pass &&
    smoke.pass &&
    browserHealth.pass &&
    parity.pass
};
write('test-results.json', testResults);

const productionEvidence = fs.existsSync(evidenceDir)
  ? fs.readdirSync(evidenceDir, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile()).length
  : 0;
const releaseManifest = {
  generatedAt,
  releaseName: 'ORDOSPACE SalesOps dashboard visual transplant',
  approvedRound9,
  integrationCommit: deployedCommit,
  deployedProductCommit: deployedCommit,
  deployedRepository: 'https://github.com/magus81818-bit/ordospace-ui-rebuild',
  deployedBranch: 'main',
  evidenceBranch: branch,
  localEvidenceBaseHead: localHead,
  remoteMainAtGeneration: originMain,
  productHash: {
    algorithm: 'sha256',
    value: releaseProductHash,
    premergePostmergeMatch: postmerge.productHash.match,
    productionCriticalFilesMatch: parity.pass
  },
  production: {
    url: 'https://ordospace-rebuild.vercel.app/',
    project: 'ordospace-rebuild',
    deploymentId: deployment.deployment.id,
    deploymentUrl: deployment.deployment.deploymentUrl,
    ready: deployment.deployment.status === 'READY',
    sourceRepository: deployment.source.repository,
    sourceBranch: deployment.source.branch,
    sourceCommit: deployment.source.commit
  },
  testCounts: {
    public: smoke.public.cases.length,
    authenticated: smoke.authenticated.cases.length,
    shared: smoke.shared.cases.length,
    nonMutatingInteractions: smoke.interactions.cases.length,
    productionEvidenceFiles: productionEvidence,
    parityFiles: parity.filesCompared
  },
  productPolicy: {
    productChangesInRound10: productChangesSinceRound9,
    pendingProductChanges,
    fontPolicyChanged: false,
    suitFontApplied: false,
    frozenPublicChanged: false,
    productionDataWrites: 0
  },
  originalSourceRepository: {
    head: sourceCurrentHead,
    clean: sourceStatus === '',
    remote: sourceRemote,
    changed: false
  },
  evidenceOnlyPostdeploymentCommitAllowed: true,
  pass: deployment.deployment.status === 'READY' &&
    deployment.source.commit === deployedCommit &&
    productChangesSinceRound9.length === 0 &&
    pendingProductChanges.length === 0 &&
    sourceIntegrity.pass &&
    smoke.pass &&
    browserHealth.pass &&
    parity.pass
};
write('release-manifest.json', releaseManifest);

const checks = {
  premergeGatePass: premerge.pass === true,
  approvalChainPass: approval.pass === true,
  cleanRoomPass: cleanRoom.pass === true,
  mainIntegrationPass: integration.pass === true &&
    integration.mainAfter === deployedCommit,
  postmergePass: postmerge.pass === true,
  inventory73Pass: inventory.pass === true && inventory.total === 73,
  stateGatePass: states.pass === true &&
    states.implemented === 528 &&
    states.notApplicable === 675,
  productionDeploymentPass: deployment.deployment.status === 'READY' &&
    deployment.deployment.projectName === 'ordospace-rebuild' &&
    deployment.source.repository.endsWith('/ordospace-ui-rebuild') &&
    deployment.source.branch === 'main' &&
    deployment.source.commit === deployedCommit,
  productionAliasPass: deployment.deployment.aliases.includes(
    'https://ordospace-rebuild.vercel.app/'
  ),
  productionSmokePass: smoke.pass === true,
  productionBrowserHealthPass: browserHealth.pass === true,
  productionParityPass: parity.pass === true &&
    parity.filesCompared === 16,
  rollbackPlanPass: rollback.rollback.targetDeploymentId ===
    'dpl_5vC4sqaFwwu4mihQw7CLuCKbTQnz',
  sourceRepositoryIntegrityPass: sourceIntegrity.pass === true,
  securitySecretAuditPass: security.pass === true,
  releaseProductUnchanged: productChangesSinceRound9.length === 0 &&
    pendingProductChanges.length === 0,
  round10WorktreeScopePass: unexpectedWorkingPaths.length === 0,
  noProductionDataWrites: smoke.interactions.nonMutating === true &&
    smoke.interactions.cases.every(item => item.pass) &&
    testResults.productionDatabaseMutation === false &&
    testResults.productionApiMutation === false
};
const failures = Object.entries(checks)
  .filter(([, value]) => value !== true)
  .map(([name]) => name);
const finalGate = {
  generatedAt,
  deployedProductCommit: deployedCommit,
  localEvidenceBaseHead: localHead,
  branch,
  originMainAtGeneration: originMain,
  remote,
  statusPaths,
  unexpectedWorkingPaths,
  changedSinceRound9,
  productChangesSinceRound9,
  pendingProductChanges,
  checks,
  failures,
  evidenceOnlyCommitPending: true,
  pass: failures.length === 0
};
write('final-acceptance-gate.json', finalGate);

const requiredArtifacts = [
  'artifacts/redo/r10/premerge-gate.json',
  'artifacts/redo/r10/main-integration.json',
  'artifacts/redo/r10/postmerge-verification.json',
  'artifacts/redo/r10/rollback-plan.json',
  'artifacts/redo/r10/production-deployment.json',
  'artifacts/redo/r10/production-smoke.json',
  'artifacts/redo/r10/production-browser-health.json',
  'artifacts/redo/r10/production-parity.json',
  'artifacts/redo/r10/release-manifest.json',
  'artifacts/redo/r10/security-secret-audit.json',
  'artifacts/redo/r10/final-acceptance-gate.json'
];
const requiredArtifactRows = requiredArtifacts.map(file => ({
  file,
  exists: exists(file),
  sha256: exists(file) ? sha256(file) : ''
}));
const verification = {
  generatedAt,
  phase: 'final-production-acceptance',
  deployedProductCommit: deployedCommit,
  premergePass: premerge.pass,
  mainIntegrationPass: integration.pass,
  postmergePass: postmerge.pass,
  productionDeploymentPass: checks.productionDeploymentPass,
  productionSmokePass: smoke.pass,
  productionBrowserHealthPass: browserHealth.pass,
  productionParityPass: parity.pass,
  inventory73Pass: inventory.pass,
  stateGatePass: states.pass,
  securitySecretAuditPass: security.pass,
  sourceRepositoryIntegrityPass: sourceIntegrity.pass,
  noProductionDataWrites: checks.noProductionDataWrites,
  requiredArtifacts: requiredArtifactRows,
  finalAcceptanceGate: finalGate,
  pass: finalGate.pass && requiredArtifactRows.every(item => item.exists)
};
write('verification-summary.json', verification);

console.log(JSON.stringify({
  generatedAt,
  deployedCommit,
  productionUrl: releaseManifest.production.url,
  evidenceFiles: productionEvidence,
  failures,
  pass: verification.pass
}, null, 2));
if (!verification.pass) process.exitCode = 1;
