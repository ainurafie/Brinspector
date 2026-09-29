const { loadConfig } = require('../src/config');
const { normalizeSummary } = require('../src/services/summarizer');

describe('loadConfig', () => {
  test('defaults to mock provider on port 3000', () => {
    expect(loadConfig({})).toMatchObject({ provider: 'mock', port: 3000 });
  });

  test('rejects unknown providers', () => {
    expect(() => loadConfig({ AI_PROVIDER: 'magic' })).toThrow('AI_PROVIDER must be one of');
  });

  test('requires credentials for real providers', () => {
    expect(() => loadConfig({ AI_PROVIDER: 'openai' })).toThrow('AI_BASE_URL, AI_API_KEY, AI_MODEL');
  });
});

describe('normalizeSummary', () => {
  test('maps unknown category/severity to safe defaults', () => {
    const result = normalizeSummary({ summary: 'x', category: 'WEIRD', severity: 'extreme' }, 'openai');
    expect(result).toMatchObject({ category: 'UNKNOWN', severity: 'medium', provider: 'openai' });
  });

  test('drops non-string list items and caps lists at 5', () => {
    const result = normalizeSummary({ summary: 'x', likelyCauses: ['a', 1, '', 'b', 'c', 'd', 'e', 'f'] }, 'mock');
    expect(result.likelyCauses).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  test('empty payload still yields a valid contract', () => {
    expect(normalizeSummary(null, 'mock')).toEqual({
      summary: 'No summary available.',
      category: 'UNKNOWN',
      likelyCauses: [],
      suggestedFixes: [],
      severity: 'medium',
      provider: 'mock',
    });
  });
});
