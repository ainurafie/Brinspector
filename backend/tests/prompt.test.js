const { buildMessages, CATEGORIES, SEVERITIES } = require('../src/services/prompt');

describe('buildMessages', () => {
  test('returns a system message and a user message', () => {
    const [system, user] = buildMessages({ status: 500 });
    expect(system.role).toBe('system');
    expect(user.role).toBe('user');
  });

  test('defaults to Bahasa Indonesia', () => {
    const [system] = buildMessages({ status: 500 });
    expect(system.content).toContain('Answer in Bahasa Indonesia');
  });

  test('switches to English when language=en', () => {
    const [system] = buildMessages({ status: 500 }, 'en');
    expect(system.content).toContain('Answer in English');
  });

  test('instructs the model to return only the contract JSON keys', () => {
    const [system] = buildMessages({ status: 500 });
    expect(system.content).toContain('"summary"');
    expect(system.content).toContain('"category"');
    expect(system.content).toContain('"likelyCauses"');
    expect(system.content).toContain('"suggestedFixes"');
    expect(system.content).toContain('"severity"');
  });

  test('lists every allowed category and severity so the model cannot invent one', () => {
    const [system] = buildMessages({ status: 500 });
    CATEGORIES.forEach((category) => expect(system.content).toContain(category));
    SEVERITIES.forEach((severity) => expect(system.content).toContain(severity));
  });

  test('warns the model not to guess redacted values', () => {
    const [system] = buildMessages({ status: 500 });
    expect(system.content).toContain('[REDACTED]');
  });

  test('embeds the error object as JSON in the user message', () => {
    const error = { status: 500, url: 'https://bank.example/api/transfer' };
    const [, user] = buildMessages(error);
    expect(user.content).toBe(`Failed request:\n${JSON.stringify(error, null, 2)}`);
  });
});
