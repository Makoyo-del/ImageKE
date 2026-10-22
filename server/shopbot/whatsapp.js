import { cfg } from './config.js';

const cut = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + '…' : String(s));
// Meta forbids newlines, tabs and 4+ consecutive spaces inside template variables.
const tplVar = (s) => cut(String(s ?? '-').replace(/[\r\n\t]+/g, '; ').replace(/ {2,}/g, ' ').trim() || '-', 900);

function build(to, o) {
  const base = { messaging_product: 'whatsapp', recipient_type: 'individual', to };
  if (o.type === 'document') {
    return { ...base, type: 'document', document: { id: o.mediaId, filename: o.filename, caption: cut(o.caption || '', 1000) } };
  }
  if (o.type === 'template') {
    return {
      ...base,
      type: 'template',
      template: {
        name: o.name,
        language: { code: o.lang || 'en' },
        components: [{ type: 'body', parameters: o.params.map((p) => ({ type: 'text', text: tplVar(p) })) }],
      },
    };
  }
  if (o.type === 'text') {
    return { ...base, type: 'text', text: { body: cut(o.text, 4000), preview_url: false } };
  }
  if (o.type === 'image') {
    return { ...base, type: 'image', image: { link: o.url, caption: cut(o.caption || '', 1000) } };
  }
  if (o.type === 'buttons') {
    const interactive = {
      type: 'button',
      body: { text: cut(o.body, 1024) },
      action: {
        buttons: o.buttons.slice(0, 3).map((b) => ({
          type: 'reply',
          reply: { id: b.id, title: cut(b.title, 20) },
        })),
      },
    };
    if (o.imageUrl) {
      interactive.header = {
        type: 'image',
        image: { link: o.imageUrl },
      };
    }
    return {
      ...base,
      type: 'interactive',
      interactive,
    };
  }
  if (o.type === 'list') {
    return {
      ...base,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: cut(o.body, 1024) },
        action: {
          button: cut(o.button || 'View options', 20),
          sections: o.sections.map((s) => ({
            title: cut(s.title, 24),
            rows: s.rows.map((r) => ({
              id: r.id,
              title: cut(r.title, 24),
              ...(r.description ? { description: cut(r.description, 72) } : {}),
            })),
          })),
        },
      },
    };
  }
  throw new Error(`Unknown outbound type ${o.type}`);
}

/** Throws on transient errors (so pg-boss retries); logs permanent 4xx. */
export async function sendOut(to, o) {
  const res = await fetch(`${cfg.wa.graph}/${cfg.wa.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.wa.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(build(to, o)),
    signal: AbortSignal.timeout(10_000),
  });
  if (res.ok) return;
  const err = await res.text();
  if (res.status >= 500 || res.status === 429) throw new Error(`WA ${res.status}: ${err}`);
  console.error(`[wa] permanent send error ${res.status} to ${to}: ${err}`);
}

export const sendText = (to, text) => sendOut(to, { type: 'text', text });

/** Upload a PDF buffer to WhatsApp media; returns media id. Throws on any failure (job retries). */
export async function uploadPdf(buffer, filename) {
  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', 'application/pdf');
  form.append('file', new Blob([buffer], { type: 'application/pdf' }), filename);
  const res = await fetch(`${cfg.wa.graph}/${cfg.wa.phoneNumberId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.wa.token}` },
    body: form,
    signal: AbortSignal.timeout(20_000),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.id) throw new Error(`WA media upload ${res.status}: ${JSON.stringify(j)}`);
  return j.id;
}

export const sendDocument = (to, mediaId, filename, caption) =>
  sendOut(to, { type: 'document', mediaId, filename, caption });

export const sendTemplate = (to, name, lang, params) => sendOut(to, { type: 'template', name, lang, params });

/**
 * Send typing indicator to the customer on WhatsApp and mark the message as read.
 * Graph API v21.0+ messages endpoint with status: "read" + typing_indicator: { type: "text" }
 */
export async function sendTypingIndicator(messageId) {
  if (!messageId || !cfg.wa.phoneNumberId || !cfg.wa.token) return;
  try {
    const res = await fetch(`${cfg.wa.graph}/${cfg.wa.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.wa.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
        typing_indicator: {
          type: 'text',
        },
      }),
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) {
      // Fallback: standard mark as read if typing_indicator is rejected by the Graph version
      await fetch(`${cfg.wa.graph}/${cfg.wa.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.wa.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
        signal: AbortSignal.timeout(5_000),
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('[wa] typing indicator failed:', err.message);
  }
}

