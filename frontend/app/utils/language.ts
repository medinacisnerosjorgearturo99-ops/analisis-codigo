interface LanguageInfo {
  ext: string;
  label: string;
}

type Rule = { pattern: RegExp | ((code: string) => boolean); info: LanguageInfo };

const RULES: Rule[] = [
  {
    pattern: (c) =>
      c.includes(': string') ||
      c.includes(': number') ||
      c.includes('interface ') ||
      c.includes('useState<') ||
      c.includes(': void'),
    info: { ext: 'ts', label: 'TypeScript' },
  },
  {
    pattern: (c) =>
      c.includes('import React') || c.includes('useState') || c.includes('useEffect'),
    info: { ext: 'jsx', label: 'JavaScript (React)' },
  },
  {
    pattern: (c) =>
      c.includes('def ') || c.includes('print(') || c.includes('if __name__'),
    info: { ext: 'py', label: 'Python' },
  },
  {
    pattern: (c) =>
      c.includes('public class') || c.includes('System.out') || c.includes('import java.'),
    info: { ext: 'java', label: 'Java' },
  },
  {
    pattern: (c) =>
      c.includes('namespace ') || c.includes('Console.Write') || c.includes('using System'),
    info: { ext: 'cs', label: 'C#' },
  },
  {
    pattern: (c) => c.includes('<?php') || c.includes('$_GET') || c.includes('$_POST'),
    info: { ext: 'php', label: 'PHP' },
  },
  {
    pattern: (c) => c.includes('<!DOCTYPE') || c.includes('<html') || c.includes('<body'),
    info: { ext: 'html', label: 'HTML' },
  },
  {
    pattern: (c) =>
      c.includes('{') && (c.includes('color:') || c.includes('margin:') || c.includes('padding:')),
    info: { ext: 'css', label: 'CSS' },
  },
  {
    pattern: (c) => c.startsWith('<?xml') || c.startsWith('<project'),
    info: { ext: 'xml', label: 'XML' },
  },
  {
    pattern: (c) => c.startsWith('---') || /^\w+:\s+\w+/m.test(c),
    info: { ext: 'yaml', label: 'YAML' },
  },
];

const DEFAULT: LanguageInfo = { ext: 'js', label: 'JavaScript' };

export function detectLanguage(code: string): LanguageInfo {
  const trimmed = code.trim();
  for (const rule of RULES) {
    const matches =
      typeof rule.pattern === 'function'
        ? rule.pattern(trimmed)
        : rule.pattern.test(trimmed);
    if (matches) return rule.info;
  }
  return DEFAULT;
}

export function isRepoUrl(text: string): boolean {
  const t = text.trim();
  return (
    t.startsWith('https://github.com') ||
    t.startsWith('https://gitlab.com') ||
    t.startsWith('https://bitbucket.org') ||
    t.startsWith('git@')
  );
}