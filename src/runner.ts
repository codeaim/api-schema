#!/usr/bin/env -S npx tsx

import { generate } from './generate';

console.log('Starting schema generation');
const schemaPath = process.argv[2];
console.log('Running schema generation', schemaPath);
if (!schemaPath) {
  console.error('Error: No schema file provided.');
  process.exit(1);
}
generate(schemaPath).catch((err) => {
  console.error('Error during generation:', err);
  process.exit(1);
});
console.log('Finished schema generation', schemaPath);
