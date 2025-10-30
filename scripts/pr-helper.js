#!/usr/bin/env node
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: 'inherit', ...opts });
}

function getArg(name, def) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return def;
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '');
}

try {
  // Params
  const base = getArg('base', 'main');
  const title = getArg('title', 'Gala: proposed changes');
  const body = getArg('body', 'Automated branch created by Gala PR helper.');
  const patchPath = getArg('patch');
  const nameArg = getArg('branch');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultBranch = `gala/${timestamp}`;
  const branch = nameArg || defaultBranch;

  // Ensure we are in a git repo
  run('git rev-parse --is-inside-work-tree');

  // Fetch base
  run('git fetch origin');

  // Create branch from base
  run(`git checkout -B ${branch} origin/${base}`);

  // Apply patch if provided
  if (patchPath) {
    const abs = path.resolve(patchPath);
    if (!fs.existsSync(abs)) {
      console.error(`Patch not found: ${abs}`);
      process.exit(1);
    }
    console.log(`Applying patch: ${abs}`);
    run(`git apply --whitespace=fix "${abs}"`);
  }

  // Stage and commit all changes if any
  try {
    // Check status
    const status = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
    if (status.stdout && status.stdout.trim().length > 0) {
      run('git add -A');
      run(`git commit -m "${title.replace(/"/g, '\\"')}" -m "${body.replace(/"/g, '\\"')}"`);
    } else {
      console.log('No changes to commit. Pushing branch anyway.');
    }
  } catch (e) {
    console.warn('Commit step skipped:', e.message);
  }

  // Push using PAT if available
  const pat = process.env.GITHUB_PAT || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  let pushCmd = `git push -u origin ${branch}`;

  if (pat) {
    // Derive https remote URL
    const url = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    // Support SSH or HTTPS origin; rewrite to https with token
    let httpsUrl = url;
    if (url.startsWith('git@')) {
      const m = url.match(/^git@([^:]+):(.+)\.git$/);
      if (!m) throw new Error('Unsupported SSH URL');
      httpsUrl = `https://${m[1]}/${m[2]}.git`;
    }
    // Create a temporary remote for pushing with token
    const tmp = `origin-with-token-${Date.now()}`;
    const withToken = httpsUrl.replace('https://', `https://x-access-token:${pat}@`);
    run(`git remote add ${tmp} "${withToken}"`);
    try {
      run(`git push -u ${tmp} ${branch}`);
    } finally {
      run(`git remote remove ${tmp}`);
    }
  } else {
    run(pushCmd);
  }

  console.log('\nDone. A GitHub Action will open a PR for branches under gala/*.');
  console.log(`Branch: ${branch}`);
  console.log('If needed, you can trigger the workflow manually from Actions.');
} catch (e) {
  console.error('PR helper failed:', e.message);
  process.exit(1);
}

