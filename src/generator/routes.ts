import fs from 'fs';
import { OAS, OASOperation } from '../oas';

export async function generateRoutes(schema: OAS) {
  const dir =
    'generated/' + schema.info.title.toLowerCase().replace(/ /g, '-') + '/';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(dir + 'routes.ts', routes(schema));
}

function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

type AuthConfig = {
  authorizationType: 'NONE' | 'JWT' | 'CUSTOM';
  authorizerIdExpr?: string;
};

function getAuthConfig(operation: OASOperation): AuthConfig {
  const security = operation.security ?? [];

  const schemes = new Set<string>();
  for (const sec of security) {
    for (const name of Object.keys(sec)) {
      schemes.add(name);
    }
  }

  if (schemes.size === 0) {
    return { authorizationType: 'NONE' };
  }

  if (schemes.has('ApiKeyAuth') && !schemes.has('JwtAuth')) {
    return {
      authorizationType: 'CUSTOM',
      authorizerIdExpr: 'apiKeyAuthorizer.id',
    };
  }

  return {
    authorizationType: 'JWT',
    authorizerIdExpr: 'jwtAuthorizer.id',
  };
}

function routes(oas: OAS): string {
  const endpointLines: string[] = [];

  for (const [path, pathItemOrRef] of Object.entries(oas.paths)) {
    if ('$ref' in pathItemOrRef) continue;
    const pathItem = pathItemOrRef;

    const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;

    for (const method of methods) {
      const operation = pathItem[method];
      if (!operation) continue;

      const operationId = operation.operationId;
      if (!operationId) continue;

      const kebabName = camelToKebab(operationId);
      const { authorizationType, authorizerIdExpr } = getAuthConfig(operation);

      endpointLines.push(
        [
          '      {',
          `        name: \`${kebabName}\${suffix}\`,`,
          `        handler: 'index.api.${operationId}Handler',`,
          `        method: '${method.toUpperCase()}',`,
          `        path: '${path}',`,
          `        authorizationType: '${authorizationType}',`,
          authorizerIdExpr ? `        authorizerId: ${authorizerIdExpr},` : '',
          '      }',
        ]
          .filter(Boolean)
          .join('\n'),
      );
    }
  }

  return `
export interface EndpointConfig {
  name: string;
  handler: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  authorizationType: 'NONE' | 'JWT' | 'CUSTOM';
  authorizerId?: string;
}

export function createEndpoints(isProd: boolean, environment: string, jwtAuthorizer: any, apiKeyAuthorizer: any): EndpointConfig[] {
  const suffix = isProd ? '' : \`-\${environment}\`;

  return [
${endpointLines.join(',\n')}
  ];
}
`;
}
