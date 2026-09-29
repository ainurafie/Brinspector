const { ProviderError } = require('../services/summarizer');

const nullableString = { type: ['string', 'null'] };
const headerMap = { type: ['object', 'null'], additionalProperties: { type: 'string' } };

const summarizeSchema = {
  body: {
    type: 'object',
    required: ['error'],
    properties: {
      language: { type: 'string', enum: ['id', 'en'], default: 'id' },
      error: {
        type: 'object',
        required: ['method', 'url', 'status'],
        properties: {
          method: { type: 'string', minLength: 1, maxLength: 16 },
          url: { type: 'string', minLength: 1, maxLength: 4096 },
          status: { type: 'integer', minimum: 0, maximum: 599 },
          statusText: nullableString,
          errorText: nullableString,
          resourceType: nullableString,
          durationMs: { type: ['number', 'null'], minimum: 0 },
          requestHeaders: headerMap,
          responseHeaders: headerMap,
          requestBody: nullableString,
          responseBody: nullableString,
        },
      },
    },
  },
};

async function summarizeRoutes(app, { summarizer }) {
  app.post('/api/summarize', { schema: summarizeSchema }, async (request, reply) => {
    const { error, language } = request.body;
    try {
      return await summarizer.summarize(error, language);
    } catch (err) {
      if (err instanceof ProviderError) {
        request.log.warn({ reason: err.message }, 'AI provider failure');
        return reply.code(502).send({ statusCode: 502, error: 'Bad Gateway', message: err.message });
      }
      throw err;
    }
  });
}

module.exports = summarizeRoutes;
