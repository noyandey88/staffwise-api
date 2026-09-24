import { resolveEnvFiles } from './env-files.js';

describe('resolveEnvFiles', () => {
  it('loads only the root .env file', () => {
    expect(resolveEnvFiles()).toEqual(['.env']);
  });
});
