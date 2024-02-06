import { OAS } from '../oas';
import fs from 'fs';

export async function generateJson(schema: OAS) {
  const dir =
    'generated/' + schema.info.title.toLowerCase().replace(/ /g, '-') + '/';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(dir + 'schema.json', JSON.stringify(schema));
}
