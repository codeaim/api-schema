import { OAS } from '../oas';
import fs from 'fs';

export async function generateApi(schema: OAS) {
  const dir =
    'generated/' + schema.info.title.toLowerCase().replace(/ /g, '-') + '/';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(dir + 'api.ts', await api(schema));
}

export async function api(schema: OAS): Promise<string> {
  const operations = Object.keys(schema.paths).flatMap((path) =>
    Object.keys(schema.paths[path]).map((operation) => ({
      operationId: schema.paths[path][operation].operationId,
      operation,
      path,
    })),
  );
  return `
import middy, { MiddlewareObj } from '@middy/core'
import cors from '@middy/http-cors'
import httpRouterHandler, { Method } from '@middy/http-router'
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export interface ${schema.info.title.replace(/ /g, '')}Handlers {
    ${operations
      .map(
        ({ operationId }) =>
          `${operationId}: (request: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;`,
      )
      .join('\n    ')}
}

export interface ${schema.info.title.replace(/ /g, '')}Filters {
    global: MiddlewareObj[];
    ${operations.map(({ operationId }) => `${operationId}: MiddlewareObj[];`).join('\n    ')}
}

export class ${schema.info.title.replace(/ /g, '')} {
    handlers: Partial<${schema.info.title.replace(/ /g, '')}Handlers> = {};
    filters: Partial<${schema.info.title.replace(/ /g, '')}Filters> = {
        global: [cors()]
    };
    
    ${operations
      .map(
        ({ operationId }) =>
          `${operationId}Handler = middy().use([...(this.filters.global || []), ...(this.filters.${operationId} || [])]).handler(this.handlers.${operationId}?.bind(this) ?? (async () => ({statusCode: 501, body: JSON.stringify({ message: "Not Implemented" })})))`,
      )
      .join('\n\n  ')}
    
    routes = [${operations
      .map(
        ({ operationId, operation, path }) =>
          `{
              method: '${operation.toUpperCase()}' as Method,
              path: '${path}',
              handler: this.${operationId}Handler
           }`,
      )
      .join(',')}
   ]
   
   handler = middy().handler(httpRouterHandler(this.routes))
    
}
`;
}
