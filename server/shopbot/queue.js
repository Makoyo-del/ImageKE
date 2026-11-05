import { EventEmitter } from 'node:events';
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

/**
 * High-performance, zero-egress in-memory queue adapter.
 * Replaces continuous 0.5s Supabase polling loops that generated 681 MB/day egress.
 * Delivers instant (< 10ms) WhatsApp message processing with 0 bytes database egress when idle.
 */
export class InMemoryBoss extends EventEmitter {
  constructor() {
    super();
    this.handlers = new Map();
    this.intervals = [];
    this.isStarted = false;
  }

  async start() {
    this.isStarted = true;
    console.log('⚡ [shopbot queue] InMemoryBoss active. Zero Supabase polling egress.');
    return this;
  }

  async createQueue(_name, _opts) {
    return true;
  }

  async send(queueName, data, opts = {}) {
    const delayMs = Number(opts.startAfter || 0) * 1000;
    const job = {
      id: 'job_' + Math.random().toString(36).slice(2),
      data,
      name: queueName,
      createdOn: new Date().toISOString()
    };

    const dispatch = async () => {
      const handler = this.handlers.get(queueName);
      if (handler) {
        try {
          await handler([job]);
        } catch (err) {
          console.error(`[in-memory-queue] Error in handler for ${queueName}:`, err.message);
          this.emit('error', err);
        }
      } else {
        console.warn(`[in-memory-queue] No worker registered for queue: ${queueName}`);
      }
    };

    if (delayMs > 0) {
      setTimeout(dispatch, delayMs).unref?.();
    } else {
      setImmediate(dispatch);
    }
    return job.id;
  }

  async work(queueName, _opts, handler) {
    this.handlers.set(queueName, handler);
    return true;
  }

  async schedule(queueName, _cronExpr) {
    // Reaper runs every 15 minutes instead of every 60s to protect database egress
    const intervalMs = queueName === Q.REAPER ? 15 * 60 * 1000 : 5 * 60 * 1000;
    const timer = setInterval(async () => {
      const handler = this.handlers.get(queueName);
      if (handler) {
        try {
          await handler([]);
        } catch (err) {
          console.error(`[in-memory-queue] Scheduled task ${queueName} error:`, err.message);
        }
      }
    }, intervalMs);
    timer.unref?.();
    this.intervals.push(timer);
    return true;
  }

  async stop() {
    this.isStarted = false;
    for (const t of this.intervals) clearInterval(t);
    this.intervals = [];
    this.handlers.clear();
  }
}

export async function initBoss() {
  // Default to zero-egress InMemoryBoss to prevent exceeding Supabase 5 GB limit
  const queueMode = (process.env.SHOPBOT_QUEUE || 'memory').trim().toLowerCase();
  if (queueMode !== 'pgboss') {
    const memBoss = new InMemoryBoss();
    await memBoss.start();
    return memBoss;
  }

  // Fallback to pg-boss only if explicitly forced via SHOPBOT_QUEUE=pgboss
  const boss = new PgBoss({
    connectionString: cfg.databaseUrl,
    schema: 'pgboss',
    max: 2,
    application_name: 'shopbot-boss',
    ssl: cfg.databaseUrl && !cfg.databaseUrl.includes('localhost') ? { rejectUnauthorized: false } : false,
  });
  boss.on('error', (e) => console.error('[pg-boss]', e.message));

  await boss.start();

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
