/**
 * ═══════════════════════════════════════════════════════════════
 * SessionFlow — Architecture Guard (Build-Time Enforcement)
 * ═══════════════════════════════════════════════════════════════
 * 
 * Scans src/pages/ and src/components/ for violations of the 
 * centralized data layer architecture:
 * 
 *   1. Direct API imports (importing from api/resources*)
 *   2. Direct fetch/axios calls
 *   3. useEffect-based data fetching patterns
 * 
 * Run: npx tsx scripts/arch-guard.ts
 * CI:  Add to build pipeline before tsc
 * 
 * Exit code 0 = clean, 1 = violations found
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ─── Configuration ────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_ROOT = path.resolve(__dirname, "../src");

// Files that MUST use query hooks (not direct API calls)
const GUARDED_DIRS = ["pages", "components", "hooks"];

// Files explicitly allowed to import from api/* (whitelist)
const ALLOWED_FILES = new Set([
  "LoginPage.tsx",       // Auth is a one-shot mutation, not cached
  "RegisterPage.tsx",    // Same
  "TimetablePage.tsx",   // getFreeSlots is a user-action-triggered one-shot lookup
]);

// Patterns that indicate architectural violations
const VIOLATION_PATTERNS: Array<{ pattern: RegExp; message: string; severity: "error" | "warn" }> = [
  {
    pattern: /from\s+["'][\.\.\/]*api\/resources/,
    message: "Direct API import detected. Use a query hook from src/queries/ instead.",
    severity: "error",
  },
  {
    pattern: /from\s+["'][\.\.\/]*api\/client/,
    message: "Direct client import detected. Components must never import fetchWithAuth directly.",
    severity: "error",
  },
  {
    pattern: /import\(.*api\/resources/,
    message: "Dynamic API import detected. Use a query hook from src/queries/ instead.",
    severity: "error",
  },
  {
    pattern: /await\s+fetch\s*\(/,
    message: "Direct fetch() call detected. All data fetching must go through TanStack Query hooks.",
    severity: "error",
  },
  {
    pattern: /axios\.(get|post|put|delete|patch)\s*\(/,
    message: "Direct axios call detected. All data fetching must go through TanStack Query hooks.",
    severity: "error",
  },
  {
    pattern: /useEffect\s*\(\s*\(\)\s*=>\s*\{[^}]*\.getAll\s*\(/,
    message: "useEffect-based data fetching detected. Use useQuery() instead.",
    severity: "warn",
  },
  {
    pattern: /refetchOnMount\s*:\s*true/,
    message: "refetchOnMount: true overrides the global default. This will cause unnecessary re-fetching on navigation.",
    severity: "warn",
  },
  {
    pattern: /refetchOnWindowFocus\s*:\s*true/,
    message: "refetchOnWindowFocus: true will cause re-fetching when the user tabs back. This is disabled by default.",
    severity: "warn",
  },
];

// ─── Scanner ──────────────────────────────────────────────────

interface Violation {
  file: string;
  line: number;
  message: string;
  severity: "error" | "warn";
  code: string;
}

function scanFile(filePath: string): Violation[] {
  const violations: Violation[] = [];
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const fileName = path.basename(filePath);

  // Skip whitelisted files
  if (ALLOWED_FILES.has(fileName)) return [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const rule of VIOLATION_PATTERNS) {
      if (rule.pattern.test(line)) {
        violations.push({
          file: path.relative(SRC_ROOT, filePath).replace(/\\/g, "/"),
          line: i + 1,
          message: rule.message,
          severity: rule.severity,
          code: line.trim(),
        });
      }
    }
  }

  return violations;
}

function scanDirectory(dir: string): Violation[] {
  const violations: Violation[] = [];
  
  if (!fs.existsSync(dir)) return violations;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      violations.push(...scanDirectory(fullPath));
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      violations.push(...scanFile(fullPath));
    }
  }

  return violations;
}

// ─── Main ─────────────────────────────────────────────────────

function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  SessionFlow Architecture Guard");
  console.log("═══════════════════════════════════════════════════\n");

  let allViolations: Violation[] = [];

  for (const dirName of GUARDED_DIRS) {
    const dirPath = path.join(SRC_ROOT, dirName);
    console.log(`  Scanning ${dirName}/...`);
    const violations = scanDirectory(dirPath);
    allViolations.push(...violations);
  }

  const errors = allViolations.filter(v => v.severity === "error");
  const warnings = allViolations.filter(v => v.severity === "warn");

  console.log("");

  if (allViolations.length === 0) {
    console.log("  ✅ No architectural violations detected.\n");
    console.log("  All components are using the centralized query layer correctly.");
    console.log("═══════════════════════════════════════════════════\n");
    process.exit(0);
  }

  // Print violations
  for (const v of allViolations) {
    const icon = v.severity === "error" ? "❌" : "⚠️";
    console.log(`  ${icon} ${v.file}:${v.line}`);
    console.log(`     ${v.message}`);
    console.log(`     > ${v.code}\n`);
  }

  console.log("───────────────────────────────────────────────────");
  console.log(`  Errors: ${errors.length}  |  Warnings: ${warnings.length}`);
  console.log("═══════════════════════════════════════════════════\n");

  if (errors.length > 0) {
    console.log("  ❌ BUILD BLOCKED: Fix errors before proceeding.\n");
    console.log("  Rule: All data fetching must go through src/queries/ hooks.");
    console.log("  Docs: See ARCHITECTURE.md for the data layer specification.\n");
    process.exit(1);
  }

  // Warnings only — don't block
  process.exit(0);
}

main();
