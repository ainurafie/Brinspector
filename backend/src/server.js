require('dotenv').config({ quiet: true });
const { loadConfig } = require('./config');
const { buildApp } = require('./app');

async function start() {
  const config = loadConfig();
  const app = buildApp({ config, logger: { level: 'info' } });
  try {
    await app.listen({ port: config.port, host: '127.0.0.1' });
    app.log.info(`BRINSPECTOR backend ready (AI_PROVIDER=${config.provider})`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start().catch((err) => {
  console.error(`[brinspector-backend] ${err.message}`);
  process.exit(1);
});
