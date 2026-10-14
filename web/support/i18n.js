/* eslint-env node */
import fs from 'node:fs/promises';
import path from 'node:path';

const interpolation = /\{[^}]+\}/ig;
const messages = process.argv[3] || './src/lib/i18n/messages';

const names = (await fs.readdir(messages)).filter((item) => item.endsWith('.json'));
const files = await Promise.all(names.map(async (name) => {
  return {
    name,
    data: JSON.parse(await fs.readFile(path.resolve(messages, name), 'utf-8')),
  };
}));

function check() {
  let ok = true;
  for (const { name, data } of files) {
    for (const key of Object.keys(data)) {
      const value = data[key];
      if (typeof value !== 'string') {
        console.log(`${name} "${key}" Value is not a string (${value === null ? 'null' : typeof value})`);
        ok = false;
        continue;
      }
      const inKey = new Set(key.match(interpolation) || []);
      for (const match of key.matchAll(interpolation)) {
        if (!value.includes(match[0])) {
          const msg = `${name} "${key}" Missing interpolation ${match[0]} in "${value}"`;
          console.log(msg);
          ok = false;
        }
      }
      // A placeholder the source string does not declare is rendered literally by
      // the UI, so it is a translation bug even though nothing is "missing".
      for (const match of value.matchAll(interpolation)) {
        if (!inKey.has(match[0])) {
          const msg = `${name} "${key}" Unexpected interpolation ${match[0]} in "${value}"`;
          console.log(msg);
          ok = false;
        }
      }
    }
  }
  if (!ok) {
    throw new Error('Interpolation check failed!');
  }
}

function count() {
  let total = 0;
  for (const { name, data } of files) {
    const count = Object.keys(data).reduce((count, key) => {
      if (data[key]) return count;
      return count + key.split(' ').filter((word) => !word.match(interpolation)).length;
    }, 0);
    total += count;
    console.log(`${name} \t${count}`);
  }
  console.log(`total untranslated words: ${total} `);
}

switch (process.argv[2]) {
  case 'count':
    count();
    break;
  case 'check':
    check();
    break;
  default:
    throw new Error('Unsupported command');
}
