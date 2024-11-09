import { generate } from '../generate';

describe('Generate', () => {
  it('should generate types from the schema', async () => {
    await generate('./test/exampleSpecification.ts');
  });
});
