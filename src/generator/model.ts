import { OAS } from '../oas';
import fs from 'fs';
import { jsonSchemaToZod } from 'json-schema-to-zod';

export async function generateModel(schema: OAS) {
  const dir =
    'generated/' + schema.info.title.toLowerCase().replace(/ /g, '-') + '/';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(dir + 'model.ts', await models(schema));
}

export async function models(oas: OAS): Promise<string> {
  const schemas = oas.components?.schemas ?? {};
  return `
    ${Object.keys(schemas)
      .map((it, index) =>
        jsonSchemaToZod(schemas[it], {
          module: 'esm',
          name: it,
          type: true,
          noImport: index !== 0,
        }),
      )
      .join('\n ')}
  `;
}
