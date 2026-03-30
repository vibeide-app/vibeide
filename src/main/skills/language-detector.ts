// Detect project languages by scanning file extensions

import { promises as fs } from 'node:fs';
import path from 'node:path';

const LANG_EXTENSIONS = new Map<string, string>([
  ['.ts', 'typescript'], ['.tsx', 'typescript'],
  ['.js', 'javascript'], ['.jsx', 'javascript'], ['.mjs', 'javascript'],
  ['.py', 'python'], ['.pyw', 'python'],
  ['.go', 'go'],
  ['.rs', 'rust'],
  ['.swift', 'swift'],
  ['.php', 'php'],
  ['.java', 'java'],
  ['.kt', 'kotlin'], ['.kts', 'kotlin'],
  ['.rb', 'ruby'],
  ['.cs', 'csharp'],
  ['.cpp', 'cpp'], ['.cc', 'cpp'], ['.cxx', 'cpp'], ['.c', 'cpp'], ['.h', 'cpp'], ['.hpp', 'cpp'],
  ['.pl', 'perl'], ['.pm', 'perl'],
]);

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next', '__pycache__', 'target', 'vendor']);
const MAX_FILES = 500;

export async function detectProjectLanguages(projectPath: string): Promise<readonly string[]> {
  const counts = new Map<string, number>();
  let scanned = 0;

  async function scan(dir: string, depth: number): Promise<void> {
    if (depth > 2 || scanned >= MAX_FILES) return;

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (scanned >= MAX_FILES) break;

        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
            await scan(path.join(dir, entry.name), depth + 1);
          }
        } else {
          scanned++;
          const ext = path.extname(entry.name).toLowerCase();
          const lang = LANG_EXTENSIONS.get(ext);
          if (lang) {
            counts.set(lang, (counts.get(lang) ?? 0) + 1);
          }
        }
      }
    } catch { /* skip inaccessible dirs */ }
  }

  await scan(projectPath, 0);

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang);
}
