import { SchemaBuilder } from '../schema-type';

const exampleSchemas = SchemaBuilder.create()
  .add('Collection', (s) =>
    s.object(
      {
        totalItems: s.number(),
      },
      {
        view: s.object({
          next: s.string(),
        }),
      },
    ),
  )
  .add('StringArray', (s) => s.array(s.string()))
  .add('Message', (s) =>
    s.object({
      name: s.string(),
      email: s.string(),
      telephone: s.string(),
      message: s.string(),
    }),
  )
  .add('Stats', (s) =>
    s.object({
      highestValue: s.number(),
      highestCycle: s.number(),
      totalTenders: s.number(),
      firstPublished: s.string(),
      lastUpdated: s.string(),
    }),
  )
  .add('Tender', (s) =>
    s.object(
      {
        id: s.number(),
        title: s.string(),
        ca: s.string(),
        descriptionTruncated: s.string(),
        description: s.string(),
        procedure: s.string(),
        status: s.string(),
        value: s.number(),
        cycle: s.number(),
      },
      {
        published: s.string(),
        deadline: s.string(),
        awarded: s.string(),
        promoted: s.boolean(),
        contact: s.string(),
        category: s.string(),
        type: s.string(),
        evaluation: s.string(),
        nuts: s.array(s.string()),
        codes: s.array(s.string()),
      },
    ),
  )
  .add('TenderCollection', (s) =>
    s.allOf(
      s.reference('Collection'),
      s.object({
        member: s.array(s.reference('Tender')),
      }),
    ),
  )
  .add('SortBy', (s) =>
    s.anyOf(
      s.stringWith({ const: 'title' }),
      s.stringWith({ const: 'ca' }),
      s.stringWith({ const: 'descriptionTruncated' }),
      s.stringWith({ const: 'published' }),
      s.stringWith({ const: 'deadline' }),
      s.stringWith({ const: 'procedure' }),
      s.stringWith({ const: 'status' }),
      s.stringWith({ const: 'awarded' }),
      s.stringWith({ const: 'value' }),
      s.stringWith({ const: 'cycle' }),
    ),
  )
  .add('SortDirection', (s) =>
    s.anyOf(s.stringWith({ const: 'desc' }), s.stringWith({ const: 'asc' })),
  )
  .add('PropertyType', (s) =>
    s.anyOf(
      s.stringWith({ const: 'category' }),
      s.stringWith({ const: 'codes' }),
      s.stringWith({ const: 'evaluation' }),
      s.stringWith({ const: 'nuts' }),
      s.stringWith({ const: 'ca' }),
      s.stringWith({ const: 'procedure' }),
      s.stringWith({ const: 'status' }),
      s.stringWith({ const: 'type' }),
    ),
  )
  .build();

export default exampleSchemas;
