#!/usr/bin/env tsx

import { OAS } from './oas';
import { generateModel } from './generator/model';
import { generateApi } from './generator/api';
import { generateSdk } from './generator/sdk';
import {generateJson} from "./generator/json";

const schema: OAS = (await import(process.argv[2])).default;

await generateModel(schema);
await generateApi(schema);
await generateSdk(schema);
await generateJson(schema);
