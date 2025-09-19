import fs from 'fs';
import path from 'path';
import type { OAS, OASOperation, OASRef, OASResponse } from '../oas';
import { pathsFrom, methodOperations, traversePath } from './sdk';

function ensureDirForFile(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function opNameFromPath(method: string, apiPath: string, operationId?: string) {
  if (operationId) return operationId;
  const parts = apiPath
    .split('/')
    .filter(Boolean)
    .map((seg) =>
      seg.startsWith('{') ? `By${cap(seg.slice(1, -1))}` : cap(seg),
    );
  return `${method.toLowerCase()}${parts.join('')}`;
}

function hasRequestBody(op: OASOperation) {
  return !!op.requestBody;
}

function templateParamNames(apiPath: string): string[] {
  return Array.from(apiPath.matchAll(/\{([^}]+)}/g)).map((m) => m[1]);
}

function resolveResponse(schema: OAS, resp: OASResponse | OASRef): OASResponse {
  if (resp && typeof resp === 'object' && '$ref' in resp) {
    return traversePath<OASResponse>((resp as OASRef).$ref, schema);
  }
  return resp as OASResponse;
}

function jsonStatuses(schema: OAS, op: OASOperation): Set<number> {
  const set = new Set<number>();
  const entries = Object.entries(op.responses ?? {}) as Array<
    [string, OASResponse | OASRef]
  >;
  for (const [code, resp] of entries) {
    const n = Number(code);
    if (!Number.isFinite(n)) continue;
    const def = resolveResponse(schema, resp);
    const contentTypes = def?.content ? Object.keys(def.content) : [];
    if (contentTypes.includes('application/json')) set.add(n);
  }
  return set;
}

function hasStatus(op: OASOperation, status: number): boolean {
  return String(status) in (op.responses ?? {});
}

function hasJsonRequestBody(op: OASOperation, schema: OAS): boolean {
  const rb = op.requestBody as (OASRef | any) | undefined;
  if (!rb) return false;
  const resolved =
    '$ref' in (rb ?? {}) ? traversePath((rb as OASRef).$ref, schema) : rb;
  const content = resolved?.content ? Object.keys(resolved.content) : [];
  return content.includes('application/json');
}

function collectParamsFromPathAndOp(
  oas: OAS,
  op: OASOperation,
  apiPath: string,
) {
  const list = (op.parameters ?? []).map((p) =>
    (p as any).$ref ? traversePath((p as OASRef).$ref, oas) : (p as any),
  );
  const namesInTemplate = new Set(templateParamNames(apiPath));

  const allPath = list
    .filter((p) => p.in === 'path')
    .map((p) => p.name as string);
  const pathParams = allPath.filter((n) => namesInTemplate.has(n)); // only those in template

  const query = list
    .filter((p) => p.in === 'query')
    .map((p) => p.name as string);
  const header = list
    .filter((p) => p.in === 'header')
    .map((p) => p.name as string);

  return { path: pathParams, query, header };
}

function buildSdkCallArgs(schema: OAS, op: OASOperation, apiPath: string) {
  const { path: pathParams, query: queryParams } = collectParamsFromPathAndOp(
    schema,
    op,
    apiPath,
  );
  const args: string[] = [];

  if (pathParams.length) args.push('params');
  if (hasRequestBody(op)) args.push('body');
  if (queryParams.length) {
    args.push('singles');
    args.push('multis');
  }

  args.push('fwdHeaders');
  args.push('{}');

  return args.join(', ');
}

function renderHandlerBody(
  schema: OAS,
  op: OASOperation,
  sdkMethodName: string,
  method: string,
  apiPath: string,
) {
  const { path: pathParams, query: queryParams } = collectParamsFromPathAndOp(
    schema,
    op,
    apiPath,
  );
  const needParams = pathParams.length > 0;

  const paramsDecl = needParams
    ? `const params = { ${pathParams.map((n) => `${n}: (ctx?.params?.${n} as string)`).join(', ')} };`
    : ``;

  const readBody = hasRequestBody(op)
    ? hasJsonRequestBody(op, schema)
      ? `const body = await req.json();`
      : `const body = await req.text();`
    : ``;

  const readQuery = queryParams.length
    ? `
    const url = new URL(req.url);
    const singles: Record<string,string> = {};
    const multis: Record<string,string[]> = {};
    for (const key of url.searchParams.keys()) {
      const all = url.searchParams.getAll(key);
      if (all.length > 1) multis[key] = all;
      else singles[key] = all[0]!;
    }
  `
    : ``;

  const readHeaders = `
    const fwdHeaders: Record<string,string> = {};
    for (const [k, v] of req.headers.entries()) {
      fwdHeaders[k] = v;
    }
  `;

  const call = `
    const sdk = sdkf();
    const result = await sdk.${sdkMethodName}(${buildSdkCallArgs(schema, op, apiPath)});
  `;

  const isHead = method.toUpperCase() === 'HEAD';
  if (isHead) {
    return [
      readBody,
      paramsDecl,
      readQuery,
      readHeaders,
      call,
      `
      return new Response(null, { status: result.statusCode });
    `,
    ].join('\n');
  }

  const jsonCodes = Array.from(jsonStatuses(schema, op)).sort((a, b) => a - b);
  const has204 = hasStatus(op, 204);

  const branches: string[] = [];

  for (const code of jsonCodes) {
    branches.push(`
      if (result.statusCode === ${code}) {
        return new Response(JSON.stringify(result.result), {
          status: ${code},
          headers: { "Content-Type": "application/json" }
        });
      }`);
  }

  if (has204) {
    branches.push(`
      if (result.statusCode === 204) {
        return new Response(null, { status: 204 });
      }`);
  }

  branches.push(
    `return new Response(String(result.result), { status: result.statusCode });`,
  );

  const returnStmt = branches.join('\n');

  return [readBody, paramsDecl, readQuery, readHeaders, call, returnStmt].join(
    '\n',
  );
}

export async function generateNext(schema: OAS) {
  const apiTitleKebab = schema.info.title.toLowerCase().replace(/ /g, '-');
  const sdkClass = `${schema.info.title.replace(/ /g, '')}Sdk`;

  const outFile = path.join('generated', apiTitleKebab, 'next.ts');
  ensureDirForFile(outFile);

  const fileHead = `// Auto-generated. Do not edit by hand.
import { ${sdkClass} } from "./sdk";

export type SdkFactory = () => ${sdkClass};
`;

  const blocks: string[] = [fileHead];

  for (const { path: apiPath, definition } of pathsFrom(schema)) {
    if (!definition) continue;
    for (const { method, definition: op } of methodOperations(definition)) {
      const methodName =
        op.operationId ?? opNameFromPath(method, apiPath, op.operationId);
      const body = renderHandlerBody(schema, op, methodName, method, apiPath);

      blocks.push(`
export function ${methodName}(sdkf: SdkFactory) {
  return async (req: Request, ctx?: { params?: Record<string,string> }) => {
    ${body}
  };
}
`);
    }
  }

  fs.writeFileSync(outFile, blocks.join('\n'));
}
