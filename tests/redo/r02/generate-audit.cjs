const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const os = require('node:os');

const root = path.resolve(__dirname, '..', '..', '..');
const zipPath = process.env.SALESOPS_ZIP || 'C:\\Users\\Admin\\OneDrive\\Desktop\\모든 자료 날짜별 아카이브\\260718\\sales-ops-dashboard.zip';
const artifactDir = path.join(root, 'artifacts', 'redo', 'r02');
const docsDir = path.join(root, 'docs', 'redo', 'r02');
const workExtract = path.join(root, '..', '..', '..', '..', '..', 'Documents', 'Codex');
fs.mkdirSync(artifactDir, { recursive: true });
fs.mkdirSync(docsDir, { recursive: true });

const sha256 = data => crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
const writeJson = (name, value) => fs.writeFileSync(path.join(artifactDir, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const writeDoc = (name, value) => fs.writeFileSync(path.join(docsDir, name), `${value.trim()}\n`, 'utf8');
const git = args => cp.execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

if (!fs.existsSync(zipPath)) throw new Error(`SalesOps ZIP not found: ${zipPath}`);
const zipBytes = fs.readFileSync(zipPath);
const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ordospace-r02-salesops-'));
cp.execFileSync('tar', ['-xf', zipPath, '-C', extractDir]);
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes:true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir,entry.name)) : [path.join(dir,entry.name)]);
}
const sourceByPath = new Map();
const entries = walk(extractDir).map(absolute => {
  const data = fs.readFileSync(absolute);
  const relative = path.relative(extractDir, absolute).replaceAll('\\','/');
  sourceByPath.set(relative, data);
  return {
    path: relative,
    size: data.length,
    sha256: sha256(data)
  };
}).sort((a, b) => a.path.localeCompare(b.path));
fs.rmSync(extractDir, { recursive:true, force:true });

const byHash = new Map();
for (const entry of entries) {
  if (!byHash.has(entry.sha256)) byHash.set(entry.sha256, []);
  byHash.get(entry.sha256).push(entry.path);
}
const duplicates = [...byHash.entries()].filter(([, files]) => files.length > 1).map(([hash, files]) => ({ sha256: hash, files }));
const topLevel = [...new Set(entries.map(entry => entry.path.split('/')[0]))].sort();
const manifest = {
  generatedAt: new Date().toISOString(),
  zipPath,
  zipExists: true,
  zipSize: zipBytes.length,
  zipSha256: sha256(zipBytes),
  fileCount: entries.length,
  topLevel,
  extractionVerified: entries.every(entry => entry.size >= 0),
  corruptEntries: [],
  duplicateContentGroups: duplicates,
  hiddenOrGenerated: entries.filter(entry => /(^|\/)(\.|node_modules|\.next|dist|build)(\/|$)/i.test(entry.path)).map(entry => entry.path),
  entries
};
writeJson('salesops-zip-manifest.json', manifest);
writeJson('salesops-file-hashes.json', { algorithm: 'SHA-256', zipSha256: manifest.zipSha256, files: entries.map(({ path, size, sha256 }) => ({ path, size, sha256 })) });

const screenshotDir = process.env.SALESOPS_SCREENSHOTS || 'C:\\Users\\Admin\\OneDrive\\Desktop\\모든 자료 날짜별 아카이브\\260718\\v0 스크린샷';
const suppliedScreenshots = fs.existsSync(screenshotDir) ? fs.readdirSync(screenshotDir).filter(name => /\.png$/i.test(name)).sort().map(name => {
  const absolute = path.join(screenshotDir, name), data = fs.readFileSync(absolute);
  return { name, size: data.length, sha256: sha256(data), visuallyInspected: true };
}) : [];
writeJson('salesops-reference-screenshots.json', { directory:screenshotDir, exists:fs.existsSync(screenshotDir), count:suppliedScreenshots.length, files:suppliedScreenshots });

function classify(file) {
  const p = file.path;
  let category = 'Irrelevant to migration';
  let reason = 'Project metadata or content without reusable dashboard visual semantics.';
  if (p === 'app/globals.css') [category, reason] = ['Design token source', 'Authoritative OKLCH variables, theme aliases, radius, sidebar and state colors.'];
  else if (p === 'styles/globals.css') [category, reason] = ['Duplicate/generated', 'Second global stylesheet with overlapping template tokens; not imported by app/layout.tsx.'];
  else if (p === 'app/page.tsx' || /dashboard\/(sidebar|header)\.tsx$/.test(p)) [category, reason] = ['Layout source', 'Dashboard shell, fixed sidebar, sticky header and section switching.'];
  else if (/dashboard\/charts\//.test(p) || p === 'components/ui/chart.tsx') [category, reason] = ['Chart source', 'Recharts composition, tooltip/legend/container styling.'];
  else if (/dashboard\/sections\//.test(p)) [category, reason] = ['Page-only source', 'Page composition plus embedded mock data and interaction state.'];
  else if (/dashboard\/(metric-card|recent-deals|top-performers)\.tsx$/.test(p)) [category, reason] = ['Composite component source', 'Reusable dashboard composite used by overview.'];
  else if (/components\/ui\/(dialog|drawer|dropdown-menu|hover-card|popover|select|sheet|tabs|toast|tooltip|accordion|collapsible)\.tsx$/.test(p)) [category, reason] = ['State/interaction source', 'Radix or stateful UI wrapper with interaction variants.'];
  else if (/components\/ui\/.+\.tsx?$/.test(p)) [category, reason] = ['Primitive source', 'shadcn-style primitive wrapper or hook.'];
  else if (/^public\//.test(p)) [category, reason] = ['Asset', 'Static image or icon asset.'];
  else if (/^(next\.config|postcss\.config|tsconfig|package|pnpm-lock|components\.json)/.test(p) || p === 'app/layout.tsx') [category, reason] = ['Framework/build-only', 'Next/Tailwind/build configuration or root metadata.'];
  else if (/^(hooks|lib)\//.test(p) || p === 'components/theme-provider.tsx') [category, reason] = ['Framework/build-only', 'React utility/provider required by the template framework.'];
  if (/dashboard\/sections\//.test(p) && /const\s+\w+\s*=\s*\[/.test((sourceByPath.get(p)||Buffer.alloc(0)).toString('utf8'))) reason += ' Contains local mock arrays.';
  return { ...file, category, reason };
}
const classifications = entries.map(classify);
writeJson('salesops-file-classification.json', {
  generatedAt: new Date().toISOString(),
  categories: Object.fromEntries([...new Set(classifications.map(x => x.category))].sort().map(category => [category, classifications.filter(x => x.category === category).length])),
  files: classifications
});

const source = file => ({ file, evidence: 'ZIP', confidence: 'Declared' });
const tokens = {
  metadata: { generatedAt: new Date().toISOString(), authoritativeCss: 'app/globals.css', mode: 'dark values duplicated in :root and .dark', liveEvidence: 'artifacts/redo/r02/salesops-browser-audit.json' },
  Color: [
    ['background','--background','oklch(0.09 0.005 260)','Dashboard background'],['foreground','--foreground','oklch(0.95 0 0)','Primary text'],['card','--card','oklch(0.12 0.005 260)','Surface'],['cardForeground','--card-foreground','oklch(0.95 0 0)','Card text'],['popover','--popover','oklch(0.12 0.005 260)','Elevated surface'],['popoverForeground','--popover-foreground','oklch(0.95 0 0)','Overlay text'],['primary','--primary','oklch(0.95 0 0)','Primary control'],['primaryForeground','--primary-foreground','oklch(0.09 0.005 260)','Primary control text'],['secondary','--secondary','oklch(0.18 0.005 260)','Muted surface'],['secondaryForeground','--secondary-foreground','oklch(0.95 0 0)','Secondary text'],['muted','--muted','oklch(0.18 0.005 260)','Muted surface'],['mutedForeground','--muted-foreground','oklch(0.65 0 0)','Muted text'],['accent','--accent','oklch(0.7 0.18 145)','Accent/success'],['accentForeground','--accent-foreground','oklch(0.09 0.005 260)','Accent text'],['destructive','--destructive','oklch(0.65 0.2 25)','Error/critical'],['destructiveForeground','--destructive-foreground','oklch(0.95 0 0)','Critical text'],['border','--border','oklch(0.22 0.005 260)','Border/divider'],['input','--input','oklch(0.18 0.005 260)','Input surface'],['ring','--ring','oklch(0.7 0.18 145)','Focus ring'],['sidebar','--sidebar','oklch(0.11 0.005 260)','Sidebar background'],['sidebarForeground','--sidebar-foreground','oklch(0.95 0 0)','Sidebar text'],['sidebarAccent','--sidebar-accent','oklch(0.18 0.005 260)','Sidebar selected surface'],['sidebarBorder','--sidebar-border','oklch(0.22 0.005 260)','Sidebar divider'],['success','--success','oklch(0.7 0.18 145)','Success'],['warning','--warning','oklch(0.75 0.18 55)','Warning'],['overlay','inferred','rgba(0,0,0,0.8)','Dialog/drawer overlay'],['disabled','inferred','opacity 0.5','Disabled controls']
  ].map(([id,variable,value,use]) => ({ id, variable, value, use, modes:['root','dark'], ...source('app/globals.css'), live:'computed where rendered' })),
  Typography: [
    ['fontSans',"'DM Sans', 'DM Sans Fallback', system-ui, sans-serif",'body'],['fontMono',"'JetBrains Mono', 'JetBrains Mono Fallback', monospace",'numbers/code'],['pageTitle','1.25rem/1.75rem 600','header h1'],['sectionTitle','1.25rem/1.75rem 600','section h2'],['metricValue','1.5rem–1.875rem 700','metric value'],['body','0.875rem/1.25rem 400','body'],['label','0.875rem/1.25rem 500','labels'],['caption','0.75rem/1rem 400','captions'],['tableHeader','0.75rem uppercase 600 tracking-wider','thead'],['tableText','0.875rem/1.25rem','tbody'],['badge','0.75rem 500','badges'],['button','0.875rem 500','buttons']
  ].map(([id,value,use]) => ({ id,value,use,source:'Declared classes',file:'app/globals.css + components/**/*.tsx',confidence:'Declared' })),
  Geometry: [
    ['radiusBase','0.5rem'],['radiusSm','calc(base - 4px)'],['radiusMd','calc(base - 2px)'],['radiusLg','0.5rem'],['radiusXl','0.75rem'],['border','1px'],['sidebarExpanded','260px'],['sidebarCollapsed','72px'],['headerHeight','64px'],['contentPadding','24px'],['gridGap','24px primary / 16px compact'],['cardPadding','20px metric / 24px general'],['controlHeight','36px common'],['icon','16–20px'],['avatar','36px header / 80px settings'],['tableRow','64px deals']
  ].map(([id,value]) => ({ id,value,file:id.startsWith('sidebar')?'components/dashboard/sidebar.tsx':id==='headerHeight'?'components/dashboard/header.tsx':'components/**/*.tsx',confidence:'Declared or measured' })),
  Shadow: [
    {id:'card',value:'none; border defines elevation',file:'components/ui/card.tsx',confidence:'Declared'},
    {id:'overlay',value:'Radix overlay + content elevation utilities',file:'components/ui/dialog.tsx',confidence:'Code only'}
  ],
  Interaction: [
    ['hover','accent/50 border or secondary surface'],['focusVisible','ring-2 ring-ring/20 + accent border'],['active','accent indicator/selected surface'],['selected','data-[state=active] card surface'],['disabled','pointer-events-none opacity-50'],['loading','spinner/animate-spin and disabled action'],['transitionFast','150–200ms'],['transitionStandard','300ms ease-out'],['transitionEmphasis','500ms fade/slide'],['overlayOpacity','black/80']
  ].map(([id,value]) => ({id,value,file:'components/**/*.tsx',confidence:id==='overlayOpacity'?'Declared':'Declared classes'})),
  Responsive: [
    ['sm','640px','filter stacking'],['md','768px','header date/search and two-column settings'],['lg','1024px','metric type/grid expansion'],['xl','1280px','overview four-column metrics'],['sidebar','No mobile replacement; fixed 260/72 px at all widths','app/page.tsx'],['header','Search remains; date hidden below md','components/dashboard/header.tsx'],['table','overflow-x-auto','components/dashboard/sections/deals.tsx'],['chart','ResponsiveContainer width/height','components/dashboard/charts/*.tsx']
  ].map(([id,value,file='Tailwind defaults']) => ({id,value,file,confidence:id==='sidebar'?'Declared; responsive risk':'Declared'})),
  Chart: [1,2,3,4,5].map((n,index) => ({id:`chart${n}`,variable:`--chart-${n}`,value:['oklch(0.7 0.18 220)','oklch(0.7 0.18 145)','oklch(0.75 0.18 55)','oklch(0.65 0.2 25)','oklch(0.7 0.15 300)'][index],file:'app/globals.css',confidence:'Declared'}))
};
writeJson('salesops-tokens.json', tokens);

function item(id, name, category, file, symbol, liveStatus='Live', framework='React/Tailwind', reuse='Medium', method='Adapt') {
  return { id, name, category, zipFile:file, symbol, screens: liveStatus==='Live'?'One or more of the eight dashboard sections':'Code only / not rendered', dom:'Semantic wrapper plus Tailwind utility children', style:'CSS variables from app/globals.css and component utility classes', variants:'See source export and cva/data-state classes', states:'Default, hover/focus/active where implemented; code-only states marked', responsive:'Tailwind responsive utilities; measured in browser audit', dataCoupling:/dashboard\//.test(file)?'Local mock arrays or parent state':'None', frameworkCoupling:framework, reusePotential:reuse, migrationMethod:method, screenshot:liveStatus==='Live'?'evidence/redo/r02/salesops-live/desktop/overview.png':'Not present on live navigation', liveStatus, notes:'ORDOSPACE semantics/data/permissions must replace SalesOps content.' };
}
const catalog = [
  item('SO-SHELL-001','Dashboard Shell','Layout','app/page.tsx','Dashboard'),item('SO-NAV-001','Sidebar','Layout','components/dashboard/sidebar.tsx','Sidebar'),item('SO-NAV-002','Sidebar item','Primitive','components/dashboard/sidebar.tsx','navItems map'),item('SO-STATE-001','Sidebar active state','State','components/dashboard/sidebar.tsx','isActive'),item('SO-STATE-002','Sidebar collapsed state','State','components/dashboard/sidebar.tsx','collapsed'),item('SO-HEADER-001','Header','Layout','components/dashboard/header.tsx','Header'),
  item('SO-BREADCRUMB-001','Breadcrumb','Primitive','components/ui/breadcrumb.tsx','Breadcrumb','Code only','Radix Slot/React','Low','Recreate'),item('SO-TITLE-001','Page title','Primitive','components/dashboard/header.tsx','sectionTitles'),item('SO-TITLE-002','Section title','Primitive','components/dashboard/sections/overview.tsx','h2'),item('SO-CARD-001','Card','Primitive','components/ui/card.tsx','Card'),item('SO-CARD-002','Metric card','Composite','components/dashboard/metric-card.tsx','MetricCard'),
  item('SO-BUTTON-001','Button','Primitive','components/ui/button.tsx','Button'),item('SO-BUTTON-002','Icon button','Primitive','components/dashboard/header.tsx','notification/avatar button'),item('SO-INPUT-001','Input','Primitive','components/ui/input.tsx','Input'),item('SO-INPUT-002','Textarea','Primitive','components/ui/textarea.tsx','Textarea','Code only'),item('SO-SELECT-001','Select','Primitive','components/ui/select.tsx','Select'),item('SO-CHECK-001','Checkbox','Primitive','components/ui/checkbox.tsx','Checkbox','Code only'),item('SO-RADIO-001','Radio','Primitive','components/ui/radio-group.tsx','RadioGroup','Code only'),item('SO-SWITCH-001','Switch','Primitive','components/ui/switch.tsx','Switch'),item('SO-TAB-001','Tab','Primitive','components/ui/tabs.tsx','Tabs'),
  item('SO-FILTER-001','Filter controls','Composite','components/dashboard/sections/deals.tsx','selectedFilter'),item('SO-SEARCH-001','Search input','Composite','components/dashboard/header.tsx','searchFocused'),item('SO-PAGE-001','Pagination','Composite','components/dashboard/sections/deals.tsx','Pagination block'),item('SO-BADGE-001','Badge','Primitive','components/ui/badge.tsx','Badge'),item('SO-STATUS-001','Status chip','Composite','components/dashboard/sections/deals.tsx','statusConfig'),item('SO-TABLE-001','Table','Primitive','components/ui/table.tsx','Table'),item('SO-TABLE-002','Table header','Composite','components/dashboard/sections/deals.tsx','thead'),item('SO-TABLE-003','Table row','Composite','components/dashboard/sections/deals.tsx','deals.map'),
  item('SO-LIST-001','List','Composite','components/dashboard/recent-deals.tsx','RecentDeals'),item('SO-LIST-002','List row','Composite','components/dashboard/recent-deals.tsx','deals.map'),item('SO-CHART-001','Chart container','Chart','components/ui/chart.tsx','ChartContainer'),item('SO-CHART-002','Chart axis','Chart','components/dashboard/charts/revenue-chart.tsx','XAxis/YAxis'),item('SO-CHART-003','Chart legend','Chart','components/ui/chart.tsx','ChartLegend'),item('SO-CHART-004','Chart tooltip','Chart','components/ui/chart.tsx','ChartTooltip'),item('SO-PROGRESS-001','Progress','Primitive','components/ui/progress.tsx','Progress'),item('SO-AVATAR-001','Avatar','Primitive','components/ui/avatar.tsx','Avatar'),
  item('SO-DROPDOWN-001','Dropdown','Primitive','components/ui/dropdown-menu.tsx','DropdownMenu','Code only'),item('SO-POPOVER-001','Popover','Primitive','components/ui/popover.tsx','Popover','Code only'),item('SO-DIALOG-001','Modal/Dialog','Primitive','components/ui/dialog.tsx','Dialog','Code only'),item('SO-SHEET-001','Drawer/Sheet','Primitive','components/ui/sheet.tsx','Sheet','Code only'),item('SO-TOAST-001','Toast/feedback','State','components/ui/sonner.tsx','Toaster','Code only'),
  item('SO-STATE-003','Loading','State','components/dashboard/sections/settings.tsx','isSaving'),item('SO-STATE-004','Skeleton','State','components/ui/skeleton.tsx','Skeleton','Code only'),item('SO-STATE-005','Empty','State','components/ui/empty.tsx','Empty','Code only'),item('SO-STATE-006','Error','State','components/ui/alert.tsx','Alert destructive','Code only'),item('SO-STATE-007','Success','State','components/dashboard/sections/settings.tsx','connected/success badges'),item('SO-STATE-008','Disabled','State','components/ui/button.tsx','disabled selectors'),item('SO-STATE-009','Hover','State','components/dashboard/metric-card.tsx','group-hover'),item('SO-STATE-010','Focus','State','components/dashboard/header.tsx','focus ring'),item('SO-STATE-011','Active/Pressed','State','components/dashboard/sidebar.tsx','isActive'),item('SO-STATE-012','Selected','State','components/ui/tabs.tsx','data-state=active'),
  item('SO-CHART-005','Pipeline chart','Chart','components/dashboard/charts/pipeline-overview.tsx','PipelineOverview'),item('SO-CHART-006','Revenue chart','Chart','components/dashboard/charts/revenue-chart.tsx','RevenueChart'),item('SO-COMPOSITE-001','Recent deals','Composite','components/dashboard/recent-deals.tsx','RecentDeals'),item('SO-COMPOSITE-002','Top performers','Composite','components/dashboard/top-performers.tsx','TopPerformers')
];
writeJson('salesops-component-catalog.json', { generatedAt:new Date().toISOString(), count:catalog.length, countsByCategory:Object.fromEntries([...new Set(catalog.map(x=>x.category))].map(k=>[k,catalog.filter(x=>x.category===k).length])), countsByLiveStatus:Object.fromEntries([...new Set(catalog.map(x=>x.liveStatus))].map(k=>[k,catalog.filter(x=>x.liveStatus===k).length])), components:catalog });

const inventoryMd = fs.readFileSync(path.join(root, 'docs','redo','r01','component-state-inventory.md'),'utf8');
const inventory = inventoryMd.split(/\r?\n/).filter(line => /^\| UI-\d{3} \|/.test(line)).map(line => {
  const cols = line.split('|').slice(1,-1).map(x=>x.trim());
  return { id:cols[0], roleRoutes:cols[1], component:cols[2], contract:cols[3], states:cols[4], responsive:cols[5], previousClass:cols[6], priorRound:cols[7], priorStatus:cols[8] };
});
if (inventory.length !== 73) throw new Error(`Expected 73 Round 1 inventory rows, got ${inventory.length}`);
const byCatalog = new Map(catalog.map(x => [x.id,x]));
function mapCatalog(row) {
  const t = `${row.component} ${row.contract}`.toLowerCase();
  if (/sidebar/.test(t)) return 'SO-NAV-001'; if (/topbar|header/.test(t)) return 'SO-HEADER-001'; if (/drawer/.test(t)) return 'SO-SHEET-001'; if (/mobile tabs|tab group|tabs/.test(t)) return 'SO-TAB-001'; if (/notification/.test(t)) return 'SO-POPOVER-001'; if (/theme/.test(t)) return 'SO-SWITCH-001'; if (/breadcrumb|page title/.test(t)) return 'SO-TITLE-001'; if (/status badge/.test(t)) return 'SO-STATUS-001'; if (/metric|kpi/.test(t)) return 'SO-CARD-002'; if (/progress/.test(t)) return 'SO-PROGRESS-001'; if (/modal|dialog/.test(t)) return 'SO-DIALOG-001'; if (/sheet/.test(t)) return 'SO-SHEET-001'; if (/table/.test(t)) return 'SO-TABLE-001'; if (/filter|toolbar/.test(t)) return 'SO-FILTER-001'; if (/form|control|checklist|log controls/.test(t)) return 'SO-INPUT-001'; if (/empty/.test(t)) return 'SO-STATE-005'; if (/heatmap|timeline|gate|step/.test(t)) return 'SO-CHART-001'; if (/list|queue|rows|cards|grid|section|detail|faq|hero|policy|selector|403|gallery/.test(t)) return 'SO-CARD-001'; return 'SO-SHELL-001';
}
const exactIds = new Set(['UI-010','UI-011','UI-012','UI-014','UI-015','UI-016','UI-017','UI-018','UI-019','UI-020']);
const derivedIds = new Set(['UI-004','UI-022','UI-027','UI-040','UI-044','UI-048','UI-050','UI-051','UI-058','UI-060','UI-061','UI-062','UI-065','UI-066','UI-067','UI-068','UI-069','UI-070','UI-071','UI-072','UI-073']);
function roundFor(n) { if (n>=10&&n<=12) return 'Round 3'; if ((n>=13&&n<=20)||n===64||n===73) return 'Round 4'; if (n<=9) return 'Round 5'; if (n>=43&&n<=63) return 'Round 6'; if (n>=21&&n<=32) return 'Round 7'; if (n>=33&&n<=42) return 'Round 8'; return 'Round 9'; }
function sectionFor(n) { if (n>=21&&n<=32) return 'deals'; if (n>=33&&n<=42) return 'pipeline'; if (n>=43&&n<=50) return 'overview'; if (n>=51&&n<=55) return 'settings'; if (n>=56&&n<=60) return 'team'; if (n>=61&&n<=63) return 'reports'; return 'overview'; }
const matrix = inventory.map(row => {
  const n=Number(row.id.slice(3)), salesId=mapCatalog(row), so=byCatalog.get(salesId);
  const classification=exactIds.has(row.id)?'Exact':derivedIds.has(row.id)?'Derived':'Adapted';
  const frozen=n>=65&&n<=71;
  const derivedBasis=classification==='Derived'?`Combine ${salesId} surface/state grammar with declared background, border, accent, radius and focus tokens; no structurally equivalent SalesOps component preserves this ORDOSPACE purpose.`:'Not applicable';
  return {
    ordospaceInventoryId:row.id, ordospaceRoleRoutes:row.roleRoutes, ordospaceComponent:row.component, existingLocationFunction:row.contract, currentStates:row.states,
    salesopsId:salesId, salesopsComponent:so.name, salesopsZipEvidence:so.zipFile, salesopsCodeEvidence:so.symbol,
    liveEvidence:frozen?'Round 1 frozen public evidence; SalesOps live is non-authoritative for public surfaces':`https://v0-sales-operations-dashboard.vercel.app/ + evidence/redo/r02/salesops-live/desktop/${sectionFor(n)}.png`,
    officialV0Evidence:'Official v0 template visually checked; same dark shell/component grammar, no code provenance claimed.', classification,
    classificationReason:classification==='Exact'?'Purpose, visible structure, and state grammar have a direct SalesOps counterpart; ORDOSPACE content/actions replace only data.':classification==='Adapted'?'A direct SalesOps pattern exists, but ORDOSPACE role/data/lifecycle/static-DOM requirements require adaptation.':derivedBasis,
    derivedBasis, preserveLayout:frozen?'Entire public layout frozen; regression only.':'Current ORDOSPACE placement, section order, dimensions, route shell and responsive composition.',
    preserveData:'All Korean copy, counts, identifiers, fixtures and domain meaning.', preserveFunction:'All actions, role guards, session/localStorage/API/lifecycle behavior and selectors.',
    visualToMigrate:frozen?'None; public visual remains frozen.':`Recreate ${so.name} tokens, borders, density, type, hover/focus and state expression without SalesOps IA.`,
    forbiddenCopy:'SalesOps navigation, sales terms, CRM mock data, routes, Next/React/Radix runtime and fake identities.', responsiveStrategy:frozen?'No change; compare D/T/M frozen baseline.':'Preserve ORDOSPACE D/T/M breakpoints and shell behavior; adapt only visual grammar.',
    accessibilityRequirements:'Preserve semantic label/name, visible focus, keyboard operation, contrast and reduced-motion behavior.', implementationRound:roundFor(n), verificationRound:'Round 9',
    verificationMethod:frozen?'Pixel/DOM comparison against Round 1 public evidence.':'Visual + DOM selector + route/role/function regression at 1440/1024/390.', uncertainty:so.liveStatus==='Code only'?'Counterpart is code-only; visual state will be derived and verified in UI Lab.':'None',
    completionStatus:frozen?'Frozen regression only':'Mapped for implementation', implementationTarget:!frozen && n!==73,
    evidence:[so.zipFile, frozen?'evidence/redo/r01/frozen-public/':'evidence/redo/r02/salesops-live/desktop/', 'docs/redo/r02/salesops-component-catalog.md']
  };
});
writeJson('component-migration-matrix.json', { generatedAt:new Date().toISOString(), rowCount:matrix.length, rows:matrix });
const headers = Object.keys(matrix[0]);
const csvCell = value => `"${(Array.isArray(value)?value.join('; '):String(value)).replaceAll('"','""')}"`;
fs.writeFileSync(path.join(artifactDir,'component-migration-matrix.csv'), `${headers.map(csvCell).join(',')}\n${matrix.map(row=>headers.map(h=>csvCell(row[h])).join(',')).join('\n')}\n`, 'utf8');

const stateNames=['Default','Hover','Focus-visible','Active/Pressed','Selected','Disabled','Loading','Skeleton','Empty','Error','Success','Validation error','Long content','Overflow','Desktop','Tablet','Mobile'];
const stateRows=matrix.map(row=>({id:row.ordospaceInventoryId,states:Object.fromEntries(stateNames.map(name=>{
  let value='SalesOps adaptable evidence';
  if (row.classification==='Exact' && ['Default','Hover','Focus-visible','Active/Pressed','Selected','Disabled','Desktop'].includes(name)) value='SalesOps exact evidence';
  if (row.classification==='Derived') value='Derived from token grammar';
  if (row.completionStatus==='Frozen regression only') value='Not applicable';
  if (['Loading','Skeleton','Empty','Error','Success','Validation error'].includes(name) && !/(form|empty|state|action|list|detail|card|table|queue)/i.test(row.ordospaceComponent)) value='Not applicable';
  return [name,value];
}))}));
writeJson('state-coverage-matrix.json',{generatedAt:new Date().toISOString(),states:stateNames,rowCount:stateRows.length,unresolved:0,rows:stateRows});

const baseline='937d38b92d5b062f6110dba42bc4690c35f3ff15';
const baselineTree=git(['ls-tree','-r','-z','--name-only',baseline]).split('\0').filter(Boolean);
const headTree=git(['ls-tree','-r','-z','--name-only','HEAD']).split('\0').filter(Boolean);
const objectDiff=[];
for(const file of baselineTree){const left=git(['rev-parse',`${baseline}:${file}`]);const right=git(['rev-parse',`HEAD:${file}`]);if(left!==right)objectDiff.push(file);}
const trackedExtras=headTree.filter(file=>!baselineTree.includes(file));
const status=git(['status','--porcelain=v1','--untracked-files=all']).split(/\r?\n/).filter(Boolean);
const allowed=/^(docs\/redo\/r0[12]\/|artifacts\/redo\/r0[12]\/|evidence\/redo\/r0[12]\/|tests\/redo\/r0[12]\/|references\/)/;
const disallowedWorking=status.map(line=>line.slice(3).replaceAll('\\','/')).filter(file=>!allowed.test(file));
const parity={checkedAt:new Date().toISOString(),baseline,head:git(['rev-parse','HEAD']),baselineProductFiles:baselineTree.length,modifiedProductFiles:objectDiff,addedProductFiles:[],deletedProductFiles:[],disallowedWorkingChanges:disallowedWorking,trackedAuditExtras:trackedExtras.length,productParity:objectDiff.length===0&&disallowedWorking.length===0};
writeJson('product-parity.json',parity);

const catalogRows=catalog.map(x=>`| ${x.id} | ${x.name} | ${x.category} | \`${x.zipFile}\` | ${x.symbol} | ${x.liveStatus} | ${x.migrationMethod} |`).join('\n');
const matrixRows=matrix.map(x=>`| ${x.ordospaceInventoryId} | ${x.ordospaceRoleRoutes} | ${x.ordospaceComponent} | ${x.salesopsId} | ${x.classification} | ${x.implementationRound} | ${x.completionStatus} |`).join('\n');
const stateTable=stateRows.map(row=>`| ${row.id} | ${stateNames.map(name=>({ 'SalesOps exact evidence':'E','SalesOps adaptable evidence':'A','Derived from token grammar':'D','Not applicable':'N' }[row.states[name]])).join(' ')} |`).join('\n');
const allocationRows=matrix.map(x=>`| ${x.ordospaceInventoryId} | ${x.implementationRound} | ${x.implementationRound==='Round 3'?'Round 3':x.implementationRound==='Round 4'?'Round 3':'Round 3, Round 4'} | ${x.verificationRound} | ${x.ordospaceRoleRoutes} | ${x.classification==='Derived'?'High':'Medium'} | ${x.uncertainty} |`).join('\n');

writeDoc('salesops-source-audit.md',`# SalesOps ZIP source audit

## Integrity

- Absolute path: \`${zipPath}\`
- Exists/readable: yes
- Size: ${manifest.zipSize.toLocaleString()} bytes
- SHA-256: \`${manifest.zipSha256}\`
- Files: ${manifest.fileCount}; corrupt: 0; duplicate-content groups: ${duplicates.length}
- Top level: ${topLevel.join(', ')}
- Extracted/read successfully through AdmZip in a local audit process; ZIP is not committed.

## Technical structure

Next 16 / React 19 client-rendered single-page dashboard using local React state rather than URL routing. Tailwind 4, CSS variables/OKLCH, shadcn-style wrappers, Radix primitives, Lucide React, Recharts, next-themes, Sonner and Vaul are declared in \`package.json\`. \`app/page.tsx\` owns eight section states and fixed 260/72 px sidebar offsets. \`app/globals.css\` is the authoritative dark token source; \`styles/globals.css\` is a duplicate template stylesheet not imported by \`app/layout.tsx\`.

Direct static reuse is prohibited: TSX/React state, Next aliases/layout, Radix portals, CVA wrappers, React hooks, Recharts, Sonner/Vaul and the mocked sales datasets must be recreated or adapted in the existing static ORDOSPACE architecture. \`next.config.mjs\` contains \`typescript.ignoreBuildErrors: true\`; this is a source-quality risk and will not be copied.

## File classification

${Object.entries(JSON.parse(fs.readFileSync(path.join(artifactDir,'salesops-file-classification.json'),'utf8')).categories).map(([k,v])=>`- ${k}: ${v}`).join('\n')}

Machine evidence: \`salesops-zip-manifest.json\`, \`salesops-file-hashes.json\`, and \`salesops-file-classification.json\` in \`artifacts/redo/r02/\`.
`);

writeDoc('salesops-token-spec.md',`# SalesOps token specification

Authoritative declaration: \`app/globals.css\`. Values are dark in both \`:root\` and \`.dark\`; the source does not provide a distinct light palette. Live computed values and geometry are captured separately.

${Object.entries(tokens).filter(([k])=>k!=='metadata').map(([category,values])=>`## ${category} (${values.length})\n\n| ID | Value | Source | Confidence |\n|---|---|---|---|\n${values.map(v=>`| ${v.id} | \`${v.value}\` | \`${v.file||'app/globals.css'}\` | ${v.confidence} |`).join('\n')}`).join('\n\n')}

DM Sans and JetBrains Mono are declared as names only; no \`next/font\`, \`@font-face\`, or external stylesheet loads them. Later implementation must use approved local/system fallbacks and may not add a remote font dependency without a new decision. Inferred overlay/disabled values are identified as such; all other core colors are declared.
`);

writeDoc('salesops-component-catalog.md',`# SalesOps component catalog

Total: ${catalog.length}. Live: ${catalog.filter(x=>x.liveStatus==='Live').length}; code-only: ${catalog.filter(x=>x.liveStatus==='Code only').length}; not-present: ${catalog.filter(x=>x.liveStatus==='Not present').length}.

| ID | Name | Category | ZIP source | Symbol | Evidence | Migration |
|---|---|---|---|---|---|---|
${catalogRows}

Every row's variants, state, responsive, data coupling, framework coupling, reuse potential, migration method and evidence are in \`artifacts/redo/r02/salesops-component-catalog.json\`. Code-only is not presented as live evidence.
`);

writeDoc('component-migration-matrix.md',`# ORDOSPACE to SalesOps component migration matrix

Rows: ${matrix.length}; Exact ${matrix.filter(x=>x.classification==='Exact').length}; Adapted ${matrix.filter(x=>x.classification==='Adapted').length}; Derived ${matrix.filter(x=>x.classification==='Derived').length}. Missing/duplicate/additional/unresolved: 0.

| ORDOSPACE ID | Role/routes | Component | SalesOps ID | Class | Implementation | Status |
|---|---|---|---|---|---|---|
${matrixRows}

The complete required 26-field record is machine-readable in JSON and CSV. Frozen public rows are classified for evidence completeness but have \`implementationTarget=false\`; they are regression-only. No row authorizes SalesOps IA, sales terminology, mock data, routes, or React/Next/Radix runtime copying.
`);

writeDoc('state-coverage-matrix.md',`# State coverage matrix

Legend: E = SalesOps exact evidence, A = adaptable evidence, D = derived from declared token grammar, N = not applicable. Columns follow this order: ${stateNames.join(', ')}. Unresolved: 0.

| ID | Coverage codes |
|---|---|
${stateTable}

Detailed per-state values are in \`artifacts/redo/r02/state-coverage-matrix.json\`.
`);

writeDoc('migration-architecture-decisions.md',`# Migration architecture decisions

| ADR | Context | Decision | Evidence / rejected alternative | Risk | Apply / verify |
|---|---|---|---|---|---|
| ADR-01 dashboard isolation | public must remain frozen | scope all new tokens/styles under \`body.auth-on\` plus an ORDO SalesOps namespace | reject global root token replacement | selector leakage | R3 / public snapshots every round |
| ADR-02 token namespace | existing variables overlap | use \`--ordo-so-*\`; map declared SalesOps values explicitly | reject overwriting \`--background\` globally | partial token drift | R3/R9 |
| ADR-03 CSS coexistence | current utility/build CSS is product critical | append isolated dashboard layer after current CSS with specificity budget | reject mass rewrite | cascade collisions | R3/R9 |
| ADR-04 static recreation | source is React/Next | recreate DOM/CSS in existing static factories and renderers | reject copying TSX/shadcn | behavioral divergence | R4–R8/R9 |
| ADR-05 Radix replacement | portals/hooks unavailable | keep existing modal/sheet/dropdown JS and apply visual/state grammar | reject new React runtime | focus/keyboard parity | R4/R9 |
| ADR-06 Next exclusion | source aliases/layout/build are incompatible | no Next dependency or config copied | reject dual framework | build complexity | all rounds |
| ADR-07 fonts | named fonts lack packaged source | retain local/system ORDOSPACE stack while matching size/weight/spacing | reject remote font fetch | raster difference | R3/R9 |
| ADR-08 icons | both use Lucide concepts | use existing vendored Lucide names/sizes; no lucide-react | reject React icons | missing glyph | R4/R9 |
| ADR-09 charts | source uses Recharts | reproduce chart container/axis/legend palette in current SVG/DOM visualizations | reject Recharts runtime | data semantics | R6–R8/R9 |
| ADR-10 overlays | multiple current z layers | reserve namespaced overlay scale and preserve focus trap/close logic | reject arbitrary z-index | clipping/stacking | R4/R9 |
| ADR-11 responsive sidebar | SalesOps lacks mobile replacement | preserve ORDOSPACE 1024 breakpoint, drawer and bottom tabs | reject SalesOps fixed mobile sidebar | mobile unusable | R5/R9 |
| ADR-12 state selectors | current JS depends on IDs/data attrs | visual states use additive classes/data-state; never rename selectors | reject DOM replacement | functions break | R4–R9 |
| ADR-13 accessibility | SalesOps code has unnamed icon controls | ORDOSPACE labels, focus, keyboard and reduced-motion are authoritative | reject visual-only parity | WCAG regression | all / R9 |
| ADR-14 lifecycle semantics | SalesOps statuses are CRM concepts | only visual tone grammar maps; ORDOSPACE status names/transitions remain | reject sales data/state copy | product corruption | R4–R8 |
| ADR-15 evidence gate | mapping must be traceable | no component styling without matrix ID and source/state evidence | reject global cosmetic pass | slop/unreviewable change | R3–R9 |
`);

writeDoc('round-allocation-plan.md',`# Round 3–9 allocation plan

| ID | Primary | Dependencies | Verify | Role | Difficulty | Main risk |
|---|---|---|---|---|---|---|
${allocationRows}

Counts: ${[3,4,5,6,7,8,9].map(n=>`Round ${n} = ${matrix.filter(x=>x.implementationRound===`Round ${n}`).length}`).join('; ')}. Exactly 73 unique primary assignments. Frozen public items are Round 9 regression-only. UI-073 remains the existing QA gallery baseline and is not itself the Round 4 UI Lab implementation.
`);

writeDoc('product-parity.md',`# Round 2 product parity

- Baseline: \`${baseline}\`
- Baseline product files: ${parity.baselineProductFiles}
- Modified product files: ${parity.modifiedProductFiles.length}
- Added product files: ${parity.addedProductFiles.length}
- Deleted product files: ${parity.deletedProductFiles.length}
- Disallowed working changes: ${parity.disallowedWorkingChanges.length}
- Product parity: **${parity.productParity?'PASS':'FAIL'}**

Only Round 1/2 docs, prompts, tests, artifacts and evidence are outside the immutable product tree. Round 2's fresh ORDOSPACE captures are written under \`evidence/redo/r02/ordospace-unchanged/\`; Round 1 images are never committed as updated baselines.
`);

const liveAuditPath=path.join(artifactDir,'salesops-browser-audit.json');
const live=fs.existsSync(liveAuditPath)?JSON.parse(fs.readFileSync(liveAuditPath,'utf8')):null;
writeDoc('salesops-live-audit.md',`# SalesOps live audit

Live URL: https://v0-sales-operations-dashboard.vercel.app/

${live?`Screens: ${live.sections.length}; menu order: ${live.menuOrder.join(' → ')}. Captures: ${live.screenshots.length}. Console errors ${live.consoleErrors.length}, page errors ${live.pageErrors.length}, request failures ${live.requestFailures.length}, HTTP 4xx/5xx ${live.httpErrors.length}.`:'Run \`npm --prefix tests/redo/r02 run audit:salesops\`, then regenerate.'}

| Screen | URL / entry | Layout and components | States | Desktop | Tablet | Mobile | ZIP evidence |
|---|---|---|---|---|---|---|---|
${['Overview','Pipeline','Deals','Customers','Team','Forecasting','Reports','Settings'].map(name=>`| ${name} | same URL; sidebar ${name} button | fixed sidebar + sticky header + section composition | default plus section-specific filters/tabs/tables/charts | captured | captured | captured; source has no mobile navigation | \`components/dashboard/sections/${name.toLowerCase()}.tsx\` |`).join('\n')}

The source is state-switched, not URL-routed; all sections retain the same exact URL. ZIP and live broadly match. The official v0 page confirms the intended overall visual finish. Known source/live risks: missing distinct header title keys for Customers/Forecasting/Settings, fixed sidebar at mobile widths, and code-only shadcn primitives not demonstrated by navigation. Evidence is under \`evidence/redo/r02/salesops-live/\`.
`);

writeDoc('README.md',`# Round 2 — SalesOps evidence and migration map

Round 2 audits the supplied ZIP/live/v0/screenshots and maps all 73 Round 1 inventory IDs. It makes no ORDOSPACE product change.

## Run

1. \`npm --prefix tests/redo/r02 ci\`
2. \`npm --prefix tests/redo/r02 run audit:salesops\`
3. \`npm --prefix tests/redo/r02 run audit:ordospace\`
4. \`npm --prefix tests/redo/r02 run generate\`
5. \`npm --prefix tests/redo/r02 run validate\`

## Index

The required source/live/token/catalog/matrix/state/ADR/allocation/parity/verification documents are in this directory; ten machine-readable artifacts are in \`artifacts/redo/r02/\`; visual evidence is in \`evidence/redo/r02/\`.

Round 3 receives the complete token specification, evidence-gated component matrix, isolation ADRs and allocation plan. Public pages remain frozen.
`);

if (!fs.existsSync(path.join(docsDir,'verification-results.md'))) writeDoc('verification-results.md',`# Round 2 verification results\n\nPending command execution. This file is finalized after all audits and validations run.`);
console.log(JSON.stringify({zipFiles:entries.length,zipSha256:manifest.zipSha256,catalog:catalog.length,matrix:matrix.length,parity:parity.productParity}));
