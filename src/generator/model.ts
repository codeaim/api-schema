import {OAS} from '../oas';
import fs from 'fs';
import {compile, JSONSchema} from 'json-schema-to-typescript';

export async function generateModel(schema: OAS) {
  const dir = 'generated/' + schema.info.title.toLowerCase().replace(/ /g, '-') + '/';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(dir + 'model.ts', await models(schema));
}

export async function models(oas: OAS): Promise<string> {
  const schemas = oas.components?.schemas ?? {};
  const fakeSchema: JSONSchema = {
    anyOf: Object.keys(schemas).map(it => ({'$ref': '#/components/schemas/' + it})),
    components: {  schemas }
  }
  return await compile(fakeSchema, '__ALL__', {bannerComment: ''});
}
