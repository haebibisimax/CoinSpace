/* eslint-env node */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { promisify } from 'node:util';

const run = promisify(execFile);
const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'i18n.js');

async function fixture(files) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'i18n-'));
  for (const [name, data] of Object.entries(files)) {
    await fs.writeFile(path.join(dir, name), JSON.stringify(data), 'utf-8');
  }
  return dir;
}

async function check(dir) {
  try {
    const { stdout } = await run(process.execPath, [script, 'check', dir]);
    return { ok: true, stdout };
  } catch (error) {
    return { ok: false, stdout: error.stdout ?? '' };
  }
}

test('a catalogue with matching placeholders passes', async () => {
  const dir = await fixture({ 'en.json': { 'Hello {name}': 'Hello {name}' } });
  const result = await check(dir);
  assert.equal(result.ok, true, result.stdout);
});

test('a missing placeholder fails', async () => {
  const dir = await fixture({ 'de.json': { 'Hello {name}': 'Hallo' } });
  const result = await check(dir);
  assert.equal(result.ok, false);
  assert.match(result.stdout, /Missing interpolation \{name\}/);
});

test('an unexpected placeholder fails', async () => {
  const dir = await fixture({ 'de.json': { Hello: 'Hallo {name}' } });
  const result = await check(dir);
  assert.equal(result.ok, false);
  assert.match(result.stdout, /Unexpected interpolation \{name\}/);
});

test('a non-string value fails with a readable message', async () => {
  const dir = await fixture({ 'de.json': { Hello: 'Hallo', Nested: { a: 1 } } });
  const result = await check(dir);
  assert.equal(result.ok, false);
  assert.match(result.stdout, /Value is not a string \(object\)/);
});
