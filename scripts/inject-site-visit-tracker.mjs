#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT_DIR = path.resolve(process.argv[2] || 'public');
const SNIPPET = '<script src="/js/site-visit-tracker.js?v=20260403-visit-v1"></script>';
const TARGET_MARK = '/js/site-visit-tracker.js';

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(abs));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      files.push(abs);
    }
  }
  return files;
}

function inject(text) {
  if (text.includes(TARGET_MARK)) {
    return { changed: false, content: text };
  }

  const hasCRLF = text.includes('\r\n');
  const EOL = hasCRLF ? '\r\n' : '\n';
  const bodyCloseMatch = text.match(/<\/body>/i);
  if (bodyCloseMatch) {
    const idx = bodyCloseMatch.index ?? -1;
    if (idx >= 0) {
      const before = text.slice(0, idx);
      const after = text.slice(idx);
      const content = `${before}  ${SNIPPET}${EOL}${after}`;
      return { changed: true, content };
    }
  }

  const suffix = text.endsWith('\n') || text.endsWith('\r') ? '' : EOL;
  return { changed: true, content: `${text}${suffix}${SNIPPET}${EOL}` };
}

async function main() {
  const htmlFiles = await walk(ROOT_DIR);
  let changedCount = 0;
  for (const file of htmlFiles) {
    const raw = await fs.readFile(file, 'utf8');
    const result = inject(raw);
    if (!result.changed) continue;
    await fs.writeFile(file, result.content, 'utf8');
    changedCount += 1;
  }
  console.log(`updated_html_files=${changedCount}`);
}

main().catch((err) => {
  console.error(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
