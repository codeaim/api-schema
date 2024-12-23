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
import middy from '@middy/core'
import cors from '@middy/http-cors'
import {APIGatewayProxyEvent, APIGatewayProxyResult} from 'aws-lambda';
import {ApiHandler, HttpMethod, bind, route, routes, filters, LoggingFilter, CorsFilter} from '@codeaim/api-builder';

export interface ${schema.info.title.replace(/ /g, '')}Handlers {
    ${operations
      .map(
        ({ operationId }) =>
          `${operationId}: (request: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;`,
      )
      .join('\n    ')}
}

export class ${schema.info.title.replace(/ /g, '')} implements ApiHandler {
    handlers: Partial<${schema.info.title.replace(/ /g, '')}Handlers> = {};
    
    apiRoutes() {
      return [${operations
        .map(
          ({ operationId, operation, path }) => `
        route('${path}', bind(HttpMethod.${operation.toUpperCase()}, this.handlers.${operationId}?.bind(this) ?? (async () => ({statusCode: 501, body: JSON.stringify({ message: "Not Implemented" })}))))`,
        )
        .join(',')}
      ];
    }
  
    handler = async (event: APIGatewayProxyEvent) => {
      return filters(
          routes(...this.apiRoutes()),
          LoggingFilter((msg) => console.log(msg)),
          CorsFilter('*')
      )(event);
    }
    
    ${operations
      .map(
        ({ operationId }) =>
          `${operationId}Handler = middy().use(cors()).handler(this.handlers.${operationId}?.bind(this) ?? (async () => ({statusCode: 501, body: JSON.stringify({ message: "Not Implemented" })})))`,
      )
      .join('\n\n  ')}
}
`;
}
