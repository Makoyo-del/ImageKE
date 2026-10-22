import './config.js';
import { initBoss } from './queue.js';
import { startServer } from './server.js';
import { startWorkers } from './worker.js';
import { pool } from './db.js';
import { cfg } from './config.js';

const boss = await initBoss();
let server;

if (cfg.role !== 'worker') server = startServer(boss);
if (cfg.role !== 'web') await startWorkers(boss);

async function shutdown(sig) {
  console.log(`[${sig}] shutting down...`);
  server?.close();
  await boss.stop({ graceful: true, timeout: 20_000 }).catch(() => {});
  await pool.end().catch(() => {});
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e));
