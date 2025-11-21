import { OAS } from './oas';
import { generateModel } from './generator/model';
import { generateApi } from './generator/api';
import { generateSdk } from './generator/sdk';
import { generateJson } from './generator/json';
import { generateNext } from './generator/next';
import { generateRoutes } from './generator/routes';

export async function generate(schemaPath: string): Promise<void> {
  const schema: OAS = (await import(schemaPath)).default;

  await Promise.all([
    generateModel(schema),
    generateApi(schema),
    generateSdk(schema),
    generateJson(schema),
    generateNext(schema),
    generateRoutes(schema),
  ]);
}
