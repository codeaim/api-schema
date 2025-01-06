import { OAS } from '../oas';
import fs from 'fs';
import { jsonSchemaToZod } from 'json-schema-to-zod';
import { compile, JSONSchema } from 'json-schema-to-typescript';

export async function generateModel(schema: OAS) {
  const dir =
    'generated/' + schema.info.title.toLowerCase().replace(/ /g, '-') + '/';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(dir + 'model.ts', await models(schema));
}

export async function models(oas: OAS): Promise<string> {
  const schemas = oas.components?.schemas ?? {};

  const fakeSchema: JSONSchema = {
    anyOf: Object.keys(schemas).map((it) => ({
      $ref: '#/components/schemas/' + it,
    })),
    components: { schemas },
  };
  const types = await compile(fakeSchema, '__ALL__', { bannerComment: '' });
  return `
    ${types}

    ${Object.keys(schemas)
      .map((it, index) =>
        jsonSchemaToZod(schemas[it], {
          module: 'esm',
          depth: 10,
          name: `${it}Schema`,
          type: true,
          noImport: index !== 0,
        }),
      )
      .join('\n ')}

export const paths = [${Object.keys(oas.paths).map((path) => `"${path}"`)}] as const;

export const Path = Object.fromEntries(
  paths.map(id => [id, id])
) as Record<typeof paths[number], typeof paths[number]>;

export type Path = keyof typeof Path;

export const operationIds = [${Object.entries(oas.paths).flatMap(
    ([, methods]) =>
      Object.values(methods)
        .map((operation) => `"${operation.operationId}"`)
        .join(','),
  )}] as const;
  
export const OperationId = Object.fromEntries(
  operationIds.map(id => [id, id])
) as Record<typeof operationIds[number], typeof operationIds[number]>;

export type OperationId = keyof typeof OperationId;

export type Operation = { 
  path: Path; 
  method: string;
  operationId: OperationId;
}

export const operations: Operation[] = [${Object.entries(oas.paths).flatMap(
    ([path, methods]) =>
      Object.entries(methods).map(
        ([method, operation]) =>
          `{ path: Path["${path}"], method: "${method.toUpperCase()}", operationId: OperationId.${operation.operationId} }`,
      ),
  )}] as const;
`;
}
