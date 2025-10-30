#!/usr/bin/env node
// Import a plaintext API keys file into a local .env, merging with .env.template
// Usage: npm run env:import -- --file "C:\\path\\to\\API Keys.txt"

const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { file: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if ((a === '--file' || a === '-f') && args[i + 1]) {
      out.file = args[++i];
    }
  }
  return out;
}

function loadTemplateEnv() {
  const templatePath = path.resolve(process.cwd(), '.env.template');
  if (fs.existsSync(templatePath)) return fs.readFileSync(templatePath, 'utf-8');
  return '';
}

function loadCurrentEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) return fs.readFileSync(envPath, 'utf-8');
  return '';
}

function toEnvMap(text) {
  const map = new Map();
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    map.set(key, val);
  });
  return map;
}

function normalizeLine(line) {
  // Accept KEY=VALUE or "Key: Value" style
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  let key = null, val = null;
  if (trimmed.includes('=')) {
    const i = trimmed.indexOf('=');
    key = trimmed.slice(0, i).trim();
    val = trimmed.slice(i + 1).trim();
  } else if (trimmed.includes(':')) {
    const i = trimmed.indexOf(':');
    key = trimmed.slice(0, i).trim().toUpperCase().replace(/\s+/g, '_');
    val = trimmed.slice(i + 1).trim();
  } else {
    return null;
  }
  // Remove surrounding quotes if any
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  return { key, val };
}

function parseKeyFile(text) {
  const pairs = [];
  text.split(/\r?\n/).forEach((line) => {
    const norm = normalizeLine(line);
    if (norm && norm.key) pairs.push(norm);
  });
  return pairs;
}

function writeEnv(envMap, orderSource) {
  // Use order from template if available, then append new keys
  const seen = new Set();
  const linesOut = [];
  if (orderSource) {
    orderSource.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        linesOut.push(line);
        return;
      }
      const eq = trimmed.indexOf('=');
      const key = trimmed.slice(0, eq).trim();
      if (envMap.has(key)) {
        linesOut.push(`${key}=${envMap.get(key)}`);
        seen.add(key);
      } else {
        linesOut.push(line);
      }
    });
  }
  // Append any keys not present in template
  envMap.forEach((val, key) => {
    if (!seen.has(key)) linesOut.push(`${key}=${val}`);
  });
  return linesOut.join('\n') + '\n';
}

(function main() {
  const { file } = parseArgs();
  if (!file) {
    console.error('Usage: npm run env:import -- --file "C:\\path\\to\\API Keys.txt"');
    process.exit(1);
  }
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) {
    console.error(`File not found: ${abs}`);
    process.exit(1);
  }

  const content = fs.readFileSync(abs, 'utf-8');
  const pairs = parseKeyFile(content);
  if (pairs.length === 0) {
    console.error('No key-value pairs found to import.');
    process.exit(1);
  }

  const template = loadTemplateEnv();
  const current = loadCurrentEnv();
  const merged = new Map();

  // Start from template, then current, then imported pairs (import wins)
  toEnvMap(template).forEach((v, k) => merged.set(k, v));
  toEnvMap(current).forEach((v, k) => merged.set(k, v));
  pairs.forEach(({ key, val }) => merged.set(key, val));

  const output = writeEnv(merged, template || current);

  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const bak = envPath + '.bak';
    fs.copyFileSync(envPath, bak);
    console.log(`Backed up existing .env to ${path.basename(bak)}`);
  }
  fs.writeFileSync(envPath, output, 'utf-8');
  console.log(`Wrote ${path.basename(envPath)} with ${pairs.length} imported keys.`);
})();

