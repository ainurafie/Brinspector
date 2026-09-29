const Fastify = require('fastify');
const cors = require('@fastify/cors');
const summarizeRoutes = require('./routes/summarize');
const { createSummarizer } = require('./services/summarizer');

/**
 * Build the Fastify app. Dependencies are injectable so tests never hit a real AI provider.
 * @param {{ config: object, summarizer?: object, logger?: boolean|object }} options
 */
function buildApp({ config, summarizer = createSummarizer(config), logger = false }) {
  // Default Fastify logging records method/url/status only — never bodies or headers (AGENTS.md).
  const app = Fastify({ logger, bodyLimit: config.bodyLimitBytes });

  app.register(cors, {
    // DevTools panel pages run on chrome-extension://<id>; localhost is for local tools.
    origin: [/^chrome-extension:\/\//, /^http:\/\/localhost(:\d+)?$/],
    methods: ['GET', 'POST'],
  });

  app.setErrorHandler((err, request, reply) => {
    if (err.validation) {
      return reply.code(422).send({ statusCode: 422, error: 'Unprocessable Entity', message: err.message });
    }
    if (err.statusCode && err.statusCode < 500) {
      return reply.code(err.statusCode).send({ statusCode: err.statusCode, error: err.name, message: err.message });
    }
    request.log.error({ err: err.message }, 'Unhandled error');
    return reply.code(500).send({ statusCode: 500, error: 'Internal Server Error', message: 'Unexpected error' });
  });

  app.get('/health', async () => ({ status: 'ok', provider: summarizer.provider }));
  app.register(summarizeRoutes, { summarizer });

  return app;
}

module.exports = { buildApp };
