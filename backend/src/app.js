const Fastify = require('fastify');
const cors = require('@fastify/cors');
const swagger = require('@fastify/swagger');
const swaggerUi = require('@fastify/swagger-ui');
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

  app.register(swagger, {
    openapi: {
      info: {
        title: 'BRINSPECTOR Backend API',
        description: 'AI-assisted root-cause summaries for failed network requests captured by the BRINSPECTOR DevTools extension.',
        version: '0.2.0',
      },
      tags: [
        { name: 'health', description: 'Service health' },
        { name: 'summarize', description: 'AI summary endpoints' },
      ],
    },
  });
  app.register(swaggerUi, {
    routePrefix: '/api-docs',
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

  // Registered as a plugin (not a direct app.get) so @fastify/swagger's onRoute
  // hook — attached during its own async registration — picks up this route too.
  app.register(async (instance) => {
    instance.get('/health', {
      schema: {
        summary: 'Health check',
        tags: ['health'],
        response: {
          200: {
            type: 'object',
            properties: { status: { type: 'string' }, provider: { type: 'string' } },
          },
        },
      },
    }, async () => ({ status: 'ok', provider: summarizer.provider }));
  });
  app.register(summarizeRoutes, { summarizer });

  return app;
}

module.exports = { buildApp };
