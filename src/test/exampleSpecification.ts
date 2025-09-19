import exampleSchemas from './exampleSchemas';
import { OpenApiSpecificationBuilder } from '../schema-type';

const tenderNiApi = OpenApiSpecificationBuilder.create(exampleSchemas, {
  title: 'Tender Ni Api',
  version: '1.0.0',
})
  .addComponent('responses', (o) => ({
    BadRequest: o.response(o.textContent()),
    Unauthorized: o.response(o.textContent()),
    Forbidden: o.response(o.textContent()),
    InternalServerError: o.response(o.textContent()),
  }))
  .defaultResponses((o) => ({
    400: o.responseReference('BadRequest'),
    401: o.responseReference('Unauthorized'),
    403: o.responseReference('Forbidden'),
    500: o.responseReference('InternalServerError'),
  }))
  .add('paths', (o) => ({
    '/category': {
      get: {
        operationId: 'getCategories',
        responses: {
          200: o.response(o.jsonContent('StringArray')),
        },
      },
    },
    '/code': {
      get: {
        operationId: 'getCodes',
        responses: {
          200: o.response(o.jsonContent('StringArray')),
        },
      },
    },
    '/contact': {
      post: {
        operationId: 'postMessage',
        requestBody: { content: o.jsonContent('Message') },
        responses: {
          201: o.response(o.textContent()),
        },
      },
    },
    '/evaluation': {
      get: {
        operationId: 'getEvaluations',
        responses: {
          200: o.response(o.jsonContent('StringArray')),
        },
      },
    },
    '/nuts': {
      get: {
        operationId: 'getNuts',
        responses: {
          200: o.response(o.jsonContent('StringArray')),
        },
      },
    },
    '/organisation': {
      get: {
        operationId: 'getOrganisations',
        responses: {
          200: o.response(o.jsonContent('StringArray')),
        },
      },
    },
    '/procedure': {
      get: {
        operationId: 'getProcedures',
        responses: {
          200: o.response(o.jsonContent('StringArray')),
        },
      },
    },
    '/status': {
      get: {
        operationId: 'getStatuses',
        responses: {
          200: o.response(o.jsonContent('StringArray')),
        },
      },
    },
    '/stats': {
      get: {
        operationId: 'getStats',
        responses: {
          200: o.response(o.jsonContent('Stats')),
        },
      },
    },
    '/tender': {
      get: {
        operationId: 'getTenders',
        parameters: [
          o.query('next', false),
          o.query('limit', false),
          o.query('organisation', false),
          o.query('procedure', false),
          o.query('status', false),
          o.query('value', false),
          o.query('cycle', false),
          o.query('sort', false),
          o.query('published', false),
          o.query('deadline', false),
          o.query('awarded', false),
          o.query('search', false),
          o.query('category', false),
          o.query('evaluation', false),
          o.query('type', false),
          o.query('promoted', false),
          o.query('code', false, true),
          o.query('nuts', false, true),
          o.query('field', false, true),
        ],
        responses: {
          200: o.response(o.jsonContent('TenderCollection')),
        },
      },
    },
    '/tender/{id}': {
      get: {
        operationId: 'getTender',
        parameters: [o.parameter('id', 'path')],
        responses: {
          200: o.response(o.jsonContent('Tender')),
        },
      },
      patch: {
        operationId: 'updateTender',
        parameters: [o.parameter('id', 'path')],
        responses: {
          204: o.response(o.textContent()),
          404: o.response(o.textContent()),
        },
      },
    },
    '/type': {
      get: {
        operationId: 'getTypes',
        responses: {
          200: o.response(o.jsonContent('StringArray')),
        },
      },
    },
  }))
  .build();

export default tenderNiApi;
