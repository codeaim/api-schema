#!/usr/bin/env npx tsx

import { OAS } from './oas';
import { generateModel } from './generator/model';
import { generateApi } from './generator/api';
import { generateSdk } from './generator/sdk';
import { generateJson } from './generator/json';

export async function generate(schemaPath: string): Promise<void> {
  const schema: OAS = (await import(schemaPath)).default;

  await Promise.all([
    generateModel(schema),
    generateApi(schema),
    generateSdk(schema),
    generateJson(schema),
  ]);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const schemaPath = process.argv[2];
  if (!schemaPath) {
    console.error('Error: No schema file provided.');
    process.exit(1);
  }
  generate(schemaPath).catch((err) => {
    console.error('Error during generation:', err);
    process.exit(1);
  });
}
