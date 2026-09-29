const CATEGORIES = [
  'CLIENT_ERROR',
  'AUTH_ERROR',
  'NOT_FOUND',
  'SERVER_ERROR',
  'NETWORK_ERROR',
  'CORS_ERROR',
  'TIMEOUT',
  'UNKNOWN',
];
const SEVERITIES = ['low', 'medium', 'high'];

function buildMessages(error, language = 'id') {
  const lang = language === 'en' ? 'English' : 'Bahasa Indonesia';
  const system = [
    'You are a senior web engineer who explains failed HTTP requests to developers and QA.',
    `Answer in ${lang}. Be concise and concrete; never invent facts not supported by the data.`,
    'Sensitive values appear as [REDACTED]; do not guess them.',
    'Return ONLY a JSON object with exactly these keys:',
    '{"summary": string (max 2 sentences),',
    ` "category": one of ${CATEGORIES.join('|')},`,
    ' "likelyCauses": string[] (max 3),',
    ' "suggestedFixes": string[] (max 3, actionable),',
    ` "severity": one of ${SEVERITIES.join('|')}}`,
  ].join('\n');

  const user = `Failed request:\n${JSON.stringify(error, null, 2)}`;
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

module.exports = { buildMessages, CATEGORIES, SEVERITIES };
