/**
 * Phase 31-33: Fix invalid Tailwind CSS variable syntax
 * Converts bg-var(--ui-*) → bg-[var(--ui-*)] across all .tsx/.ts files
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const SRC_DIR = join(process.cwd(), 'src');

// Collect all .tsx and .ts files recursively
function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (['.tsx', '.ts'].includes(extname(full))) {
      files.push(full);
    }
  }
  return files;
}

// All Tailwind utility prefixes that use CSS variables incorrectly
const PREFIXES = [
  // State variants first (longer match)
  'group-focus-within:text',
  'group-hover/code:text',
  'group-hover/avatar:bg',
  'group-hover:text',
  'group-hover:bg',
  'hover:bg',
  'hover:text',
  'hover:border',
  'focus:ring',
  'focus:border',
  'focus:outline',
  // Base utilities
  'bg',
  'text',
  'shadow',
  'border',
  'ring',
  'outline',
  'from',
  'to',
  'via',
  'fill',
  'stroke',
  'accent',
  'caret',
  'decoration',
  'divide',
  'placeholder',
];

let totalFixed = 0;
let filesChanged = 0;

for (const file of walk(SRC_DIR)) {
  let content = readFileSync(file, 'utf-8');
  let original = content;

  for (const prefix of PREFIXES) {
    // Match: prefix-var(--ui-something) but NOT already prefix-[var(--ui-something)]
    // Pattern: prefix-var(--ui-word)  →  prefix-[var(--ui-word)]
    // Also handles: prefix-var(--ui-word)/opacity  →  prefix-[var(--ui-word)]/opacity
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(
      `${escapedPrefix}-var\\(--ui-([a-z-]+)\\)`,
      'g'
    );
    
    const matches = content.match(regex);
    if (matches) {
      totalFixed += matches.length;
      content = content.replace(regex, `${prefix}-[var(--ui-$1)]`);
    }
  }

  if (content !== original) {
    writeFileSync(file, content, 'utf-8');
    filesChanged++;
    const relPath = file.replace(SRC_DIR, 'src');
    const count = (original.match(/var\(--ui-/g) || []).length - (content.match(/(?<!\[)var\(--ui-/g) || []).length;
    console.log(`✅ ${relPath} — ${count > 0 ? count : '?'} fixes`);
  }
}

console.log(`\n📊 Total: ${totalFixed} replacements across ${filesChanged} files`);
