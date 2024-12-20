import {
  OAS,
  OASOperation,
  OASParameter,
  OASPath,
  OASRef,
  OASRequestBody,
  OASResponse,
} from '../oas';
import fs from 'fs';
import { JSONSchema } from 'json-schema-to-typescript';

export async function generateSdk(schema: OAS) {
  const dir =
    'generated/' + schema.info.title.toLowerCase().replace(/ /g, '-') + '/';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(dir + 'sdk.ts', await sdk(schema));
}

function capitilize(name: string): string {
  return name.substring(0, 1).toUpperCase() + name.substring(1);
}
function name(part: string) {
  return part.startsWith('{')
    ? 'By' + capitilize(part.substring(1, part.length - 1))
    : capitilize(part);
}

function pathName(path: string) {
  return path.split('/').map(name).join('');
}

function traverse<T>(parts: string[], obj: any): T | undefined {
  if (obj && parts.length > 0 && typeof obj === 'object') {
    const nextKey = parts[0];
    if (Object.prototype.hasOwnProperty.call(obj, nextKey)) {
      const next = obj[nextKey];
      if (parts.length === 1) return next;
      else return traverse<T>(parts.slice(1), next);
    }
  }
  return undefined;
}

export function traversePath<T>(path: string, obj: any): T {
  return traverse<T>(path.replace('#/', '').split('/'), obj) as T;
}

export function pathsFrom(
  oas: OAS,
): Array<{ path: string; definition: OASPath | undefined }> {
  return Object.keys(oas.paths).map((key) => {
    const value = oas.paths[key];
    if (Object.prototype.hasOwnProperty.call(value, '$ref'))
      return {
        path: key,
        definition: traversePath((value as OASRef)['$ref'], oas),
      };
    return { path: key, definition: value as OASPath };
  });
}
export function methodOperations(
  path: OASPath,
): Array<{ method: string; definition: OASOperation }> {
  const keys = [
    'get',
    'put',
    'post',
    'delete',
    'options',
    'head',
    'patch',
    'trace',
  ];
  return Object.keys(path)
    .filter((it) => keys.includes(it))
    .map((key) => {
      const operation = (path as any)[key] as OASOperation;
      const definition: OASOperation = {
        ...operation,
        parameters: [
          ...(operation.parameters ?? []),
          ...(path.parameters ?? []),
        ],
      };
      return { method: key, definition };
    });
}

function operationParameters(
  oas: OAS,
  operation: OASOperation,
): OASParameter[] {
  return (operation.parameters ?? []).map((it) => {
    if (Object.prototype.hasOwnProperty.call(it, '$ref'))
      return traversePath((it as OASRef)['$ref'], oas);
    return it as OASParameter;
  });
}

function pathParamsParam(pathParameters: string[]): string | undefined {
  if (pathParameters.length === 0) return undefined;
  return `params: {${pathParameters.map((it) => `${it}: string`).join('; ')}}`;
}

function queryParamsParam(queryParamsParam: string[]): string | undefined {
  if (queryParamsParam.length === 0) return undefined;
  return `queryParameters: {${queryParamsParam
    .map((it) => it + '?: string')
    .join('; ')}}`;
}

function multiQueryParamsParam(
  multiQueryParamsParam: string[],
): string | undefined {
  if (multiQueryParamsParam.length === 0) return undefined;
  return `multiQueryParameters: {${multiQueryParamsParam
    .map((it) => it + '?: string[]')
    .join('; ')}}`;
}

function headerParamsParam(headerParameters: string[]): string | undefined {
  if (headerParameters.length === 0) return 'headers: Record<string, string>';
  return `headers: Record<string, string> & Partial<{${headerParameters
    .map((it) => `'${it}': string`)
    .join('; ')}}>`;
}

function configParamsParam(): string {
  return 'config: Record<string, any>';
}

export function typeFrom(
  oas: OAS,
  response: OASResponse | OASRef,
): [string, string[]] {
  const def = Object.prototype.hasOwnProperty.call(response, '$ref')
    ? traversePath<OASResponse>((response as OASRef)['$ref'], oas)
    : (response as OASResponse);
  const type = Object.keys(def.content ?? ['application/text'])[0];
  const ref = (def.content as any)[type].schema as OASRef;
  if (type === 'application/json') {
    const refValue = ref['$ref'];
    if (refValue) {
      const typeDef = traversePath<JSONSchema>(refValue, oas);
      const typeName =
        typeDef.title ?? refValue.substring(refValue.lastIndexOf('/') + 1);
      return [typeName, [typeName]];
    }
    return ['unknown', []];
  }
  return ['string', []];
}

function returnType(oas: OAS, method: OASOperation, imports: string[]): string {
  return Object.keys(method.responses)
    .map((statusCode) => {
      const response = method.responses[statusCode];
      const [type, newImports] = typeFrom(oas, response);
      imports.push(...newImports);
      return `{ statusCode: ${statusCode}; result: ${type} }`;
    })
    .join(' | ');
}

function ifCode(code: string, json: boolean): string {
  return `if(result.statusCode === ${code}) {
        return { statusCode: ${code}, headers: result.headers, result: ${
          json ? 'JSON.parse(result.body)' : 'result.body'
        }  };
      }`;
}

function bodyValue(oas: OAS, method: OASOperation): string {
  return Object.keys(method.responses)
    .map((statusCode) => {
      const response = method.responses[statusCode];
      const def = Object.prototype.hasOwnProperty.call(response, '$ref')
        ? traversePath<OASResponse>((response as OASRef)['$ref'], oas)
        : (response as OASResponse);
      const types = Object.keys(def.content ?? {});
      const json = types[0] === 'application/json';
      return ifCode(statusCode, json);
    })
    .join(' else ');
}

function bodyFrom(
  oas: OAS,
  operation: OASOperation,
  imports: string[],
): string | undefined {
  if (!operation.requestBody) return undefined;
  const bodyDefinition = Object.prototype.hasOwnProperty.call(
    operation.requestBody,
    '$ref',
  )
    ? traversePath<OASRequestBody>(
        (operation.requestBody as OASRef)['$ref'],
        oas,
      )
    : (operation.requestBody as OASRequestBody);
  const type = Object.keys(bodyDefinition.content ?? ['application/text'])[0];
  const ref = (bodyDefinition.content as any)[type].schema as OASRef;
  if (type === 'application/json') {
    const refValue = ref['$ref'];
    if (refValue) {
      const imp = refValue.substring(refValue.lastIndexOf('/') + 1);
      imports.push(imp);
      return imp;
    }
    return 'unknown';
  }
  return 'string';
}

function sdkMethod(
  path: string,
  method: string,
  pathParameters: string[],
  queryParameters: string[],
  headerParameters: string[],
  oas: OAS,
  methodDefinition: OASOperation,
  imports: string[],
): string {
  const pathParams = pathParamsParam(pathParameters);
  const headerParams = headerParamsParam(headerParameters);
  const bodyParam = bodyFrom(oas, methodDefinition, imports);
  const queryParams = queryParamsParam(queryParameters);
  const multiQueryParams = multiQueryParamsParam(queryParameters);
  const configParams = configParamsParam();
  const params = [
    pathParams,
    bodyParam && `body: ${bodyParam}`,
    queryParams,
    multiQueryParams,
    headerParams + ' = {}',
    configParams + ' = {}',
  ].filter((it) => !!it);
  const resourcePath = path.replace(/{/g, '${params.');
  const methodName =
    methodDefinition.operationId ?? `${method}${pathName(path)}`;
  return `    async ${methodName}(${params.join(', ')}): Promise<(${returnType(
    oas,
    methodDefinition,
    imports,
  )}) & {headers: Record<string, string>}>{
      const resource = '${path}';
      const path = \`${resourcePath}\`;
      const result = await this.caller.call('${method.toUpperCase()}', resource, path, ${
        bodyParam ? 'JSON.stringify(body)' : 'undefined'
      }, ${pathParams ? 'params' : '{}'}, ${
        queryParams ? 'queryParameters' : '{}'
      }, ${multiQueryParams ? 'multiQueryParameters' : '{}'}, headers, config);
      ${bodyValue(oas, methodDefinition)}
      throw new Error(\`Unknown status \${result.statusCode} returned from \${path}\`)
    }`;
}

export async function sdk(schema: OAS): Promise<string> {
  const name = schema.info.title.replace(/ /g, '') + 'Sdk';
  const paths = pathsFrom(schema);
  const imports: string[] = [];
  const sdkMethods = paths.flatMap(({ path, definition }) => {
    if (definition) {
      return methodOperations(definition).map(
        ({ method, definition: operation }) => {
          const parameters = operationParameters(schema, operation);
          const pathParameters = parameters
            .filter((it) => it.in === 'path')
            .map((it) => it.name);
          const queryParameters = parameters
            .filter((it) => it.in === 'query')
            .map((it) => it.name);
          const headerParameters = parameters
            .filter((it) => it.in === 'header')
            .map((it) => it.name);
          return sdkMethod(
            path,
            method,
            pathParameters,
            queryParameters,
            headerParameters,
            schema,
            operation,
            imports,
          );
        },
      );
    } else return [];
  });

  return `
  import { ${[...new Set([...imports])].join(', ')} } from './model'
  
  export type Caller = {
  call(
      method: string,
      resource: string,
      path: string,
      body: string | undefined,
      pathParameters: Record<string, string>,
      queryParameters: Record<string, string>,
      multiQueryParameters: Record<string, string[]>,
      headers: Record<string, string>,
      config?: Record<string, string>,
    ): Promise<{ statusCode: number; body: string; headers: Record<string, string> }>;
  }
  
  export class ${name} {
    constructor(
      private readonly caller: Caller
    ){}
  
    ${sdkMethods.join('\n\n')}
  }
  
  export * from './model.js';
`;
}
