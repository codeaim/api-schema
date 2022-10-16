import { OAS } from '../oas';
import fs from 'fs';
import { compile, JSONSchema } from 'json-schema-to-typescript';

export async function generateSdk(schema: OAS) {
  const dir =
    'generated/' + schema.info.title.toLowerCase().replace(/ /g, '-') + '/';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(dir + 'sdk.ts', await sdk(schema));
}

export async function sdk(schema: OAS): Promise<string> {
  return `
`;
}
