#!/usr/bin/env npx ts-node

import {OAS} from './oas';
import {generateModel} from './generator/model';
import {generateApi} from './generator/api';
import {generateSdk} from './generator/sdk';

const schema: OAS = (await import(process.argv[2])).default;

await generateModel(schema);
await generateApi(schema);
await generateSdk(schema);
