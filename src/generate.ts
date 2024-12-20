#!/usr/bin/env npx tsx

import { fileURLToPath } from 'url';
import { resolve } from 'path';
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

console.log("Schema generation");
if (resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  console.log("Starting schema generation");
  const schemaPath = process.argv[2];
  console.log("Running schema generation", schemaPath);
  if (!schemaPath) {
    console.error('Error: No schema file provided.');
    process.exit(1);
  }
  generate(schemaPath).catch((err) => {
    console.error('Error during generation:', err);
    process.exit(1);
  });
  console.log("Finished schema generation", schemaPath);
}
