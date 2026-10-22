import * as pgbossModule from 'pg-boss';
const PgBoss = pgbossModule.PgBoss || pgbossModule.default || pgbossModule;
import { cfg } from './config.js';

export const Q = {
  INBOUND: 'wa-inbound',
  PAYMENT: 'wa-payment-check',
  REAPER: 'wa-reaper',
  NOTIFY: 'wa-notify',
  DEAD: 'wa-dead-letter',
};

export async function initBoss() {
  const boss = new PgBoss({
    connectionString: cfg.databaseUrl,
    schema: 'pgboss',
    max: 5,
    application_name: 'shopbot-boss',
    ssl: cfg.databaseUrl && !cfg.databaseUrl.includes('localhost') ? { rejectUnauthorized: false } : false,
  });
  boss.on('error', (e) => console.error('[pg-boss]', e.message));

  await boss.start(); // creates/migrates the pgboss schema automatically

  await boss.createQueue(Q.DEAD);
  const common = {
    retryLimit: 5,
    retryDelay: 2,
    retryBackoff: true,
    expireInSeconds: 120,
    deadLetter: Q.DEAD,
  };
  await boss.createQueue(Q.INBOUND, common);
  await boss.createQueue(Q.PAYMENT, common);
  await boss.createQueue(Q.NOTIFY, common);
  await boss.createQueue(Q.REAPER, { retryLimit: 0 });

  return boss;
}

export const createBoss = initBoss;
