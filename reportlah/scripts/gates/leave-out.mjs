import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

const SKIP_DIRS = ['node_modules', '.next', '.git'];
const ALLOWED_LIB_FILES = ['lib/agency.ts'];
const ALLOWED_API_PATHS = ['app/api/mcp'];

const FEATURE_FRAGMENTS = [
  'login',
  'signup',
  'register',
  'auth',
  'account',
  'session',
  'map',
  'vote',
  'voting',
  'upvote',
  'wall',
  'feed',
  'vision',
  'ocr',
  'neighbourhood',
  'neighborhood',
  'areas',
  'send-report',
  'council',
];

const DEPENDENCY_PACKAGES = [
  'next-auth',
  'leaflet',
  'mapbox-gl',
  'maplibre-gl',
  'react-leaflet',
  '@react-google-maps/api',
  'nodemailer',
];

const PAGE_PATTERN = /^app\/(.*\/)?page\.(tsx|ts|jsx|js)$/;
const EDIT_DELETE_ROUTE_PATTERN =
  /export\s+(async\s+)?function\s+(PUT|PATCH|DELETE)\b|export\s+const\s+(PUT|PATCH|DELETE)\b/;
const IMPORT_PATTERN = /(?:from\s+|import\s*\(?\s*|require\s*\(\s*)['"]([^'"]+)['"]/g;

function isAllowedLibFile(path) {
  return ALLOWED_LIB_FILES.includes(path);
}

function isAllowedApiPath(path) {
  return ALLOWED_API_PATHS.some((allowed) => path === allowed || path.startsWith(allowed + '/'));
}

function hasFeatureFragment(path) {
  const lowerPath = path.toLowerCase();
  return FEATURE_FRAGMENTS.some((frag) => {
    // Check if fragment appears as a path segment or filename part
    const segments = lowerPath.split(/[\\/]/);
    const filename = segments[segments.length - 1];
    return segments.some((seg) => seg.includes(frag)) || filename.includes(frag);
  });
}

function hasDependencyImport(text) {
  IMPORT_PATTERN.lastIndex = 0;
  let match;
  while ((match = IMPORT_PATTERN.exec(text)) !== null) {
    const pkg = match[1];
    if (DEPENDENCY_PACKAGES.some((d) => pkg === d || pkg.startsWith(d + '/'))) {
      return true;
    }
  }
  return false;
}

function scan(files) {
  const findings = [];
  const pageFiles = [];
  const seenPaths = new Set();

  for (const file of files) {
    const { path, text } = file;
    if (seenPaths.has(path)) continue;
    seenPaths.add(path);

    // Rule 1: more than one page file
    if (PAGE_PATTERN.test(path)) {
      pageFiles.push(path);
    }

    // Rule 2: edit or delete route
    if (path.startsWith('app/api/') && !isAllowedApiPath(path)) {
      if (EDIT_DELETE_ROUTE_PATTERN.test(text)) {
        findings.push(`edit or delete route: ${path}`);
      }
    }

    // Rule 3: left-out feature file
    if ((path.startsWith('app/') || path.startsWith('lib/')) && !isAllowedLibFile(path) && !isAllowedApiPath(path)) {
      if (hasFeatureFragment(path)) {
        findings.push(`left-out feature file: ${path}`);
      }
    }

    // Rule 4: left-out dependency in file
    if ((path.startsWith('app/') || path.startsWith('lib/')) && !isAllowedLibFile(path) && !isAllowedApiPath(path)) {
      if (hasDependencyImport(text)) {
        findings.push(`left-out dependency in ${path}`);
      }
    }
  }

  // Rule 1: check for multiple page files
  if (pageFiles.length > 1) {
    findings.push('more than one page');
  }

  return findings;
}

function readFilesRecursively(rootDir, allowedExtensions, skipPaths) {
  const files = [];

  function walk(dir) {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = relative(process.cwd(), fullPath).split(sep).join('/');

      // Skip node_modules, .next, dot folders
      if (SKIP_DIRS.includes(entry.name) || entry.name.startsWith('.')) {
        continue;
      }

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = entry.name.split('.').pop();
        if (allowedExtensions.includes(ext)) {
          if (skipPaths.has(relativePath)) continue;

          try {
            const text = readFileSync(fullPath, 'utf8');
            files.push({ path: relativePath, text });
          } catch {
            // Skip unreadable files
          }
        }
      }
    }
  }

  walk(rootDir);
  return files;
}

function getPackageJsonDependencies() {
  try {
    const pkgPath = join(process.cwd(), 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const deps = new Set([...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})]);
    return deps;
  } catch {
    return new Set();
  }
}

function main() {
  const allowedExtensions = ['ts', 'tsx', 'js', 'jsx', 'mjs', 'json'];
  const skipPaths = new Set(['scripts/gates/leave-out.mjs']);

  // Collect real files
  const realFiles = [];
  const dirsToScan = ['app', 'lib', 'scripts', 'agent'];

  for (const dir of dirsToScan) {
    if (existsSync(dir) && statSync(dir).isDirectory()) {
      realFiles.push(...readFilesRecursively(dir, allowedExtensions, skipPaths));
    }
  }

  // Add package.json if exists
  const pkgPath = join(process.cwd(), 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const text = readFileSync(pkgPath, 'utf8');
      realFiles.push({ path: 'package.json', text });
    } catch {
      // Ignore
    }
  }

  // Run real scan
  const realFindings = scan(realFiles);

  // Positive control: in-memory fixture
  const fixture = [
    { path: 'app/page.tsx', text: 'export default function Page() {}' },
    { path: 'app/another/page.tsx', text: 'export default function AnotherPage() {}' },
    { path: 'app/api/test/route.ts', text: 'export async function DELETE() {}' },
    { path: 'app/login/page.tsx', text: 'export default function LoginPage() {}' },
    { path: 'lib/map-utils.ts', text: 'import leaflet from "leaflet";' },
  ];

  const controlFindings = scan(fixture);

  // Verify control returns at least 4 findings
  if (controlFindings.length < 4) {
    console.error('positive control failed');
    process.exitCode = 1;
    return;
  }

  // Report real findings
  if (realFindings.length > 0) {
    for (const finding of realFindings) {
      console.error(finding);
    }
    process.exitCode = 1;
    return;
  }

  // Check package.json dependencies
  const pkgDeps = getPackageJsonDependencies();
  const pkgJsonFindings = [];
  for (const pkg of DEPENDENCY_PACKAGES) {
    if (pkgDeps.has(pkg)) {
      pkgJsonFindings.push(`left-out dependency in package.json`);
      break;
    }
  }

  if (pkgJsonFindings.length > 0) {
    for (const finding of pkgJsonFindings) {
      console.error(finding);
    }
    process.exitCode = 1;
    return;
  }

  // All checks passed
  console.log('leave-out scan: verified');
}

main();
