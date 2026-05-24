import * as fs from 'fs';
import * as path from 'path';

const cache = new Map<string, string>();
const PROMPTS_DIR = path.resolve(process.cwd(), 'prompts');

export function loadPrompt(name: string): string {
  if (cache.has(name)) return cache.get(name)!;
  const filePath = path.join(PROMPTS_DIR, `${name}.txt`);
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    // Strip version/date header lines
    content = content.replace(/^# (VERSION|LAST_UPDATED):.*\n/gm, '').trim();
    cache.set(name, content);
    return content;
  } catch {
    return '';
  }
}

export function loadPromptWithVars(name: string, vars: Record<string, string>): string {
  let content = loadPrompt(name);
  for (const [key, value] of Object.entries(vars)) {
    content = content.replaceAll(`{{${key}}}`, value);
  }
  return content;
}
