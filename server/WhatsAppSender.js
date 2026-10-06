/**
 * ============================================================================
 * WHATSAPP CLOUD API TRANSPORT LAYER
 * ============================================================================
 * Enforces Meta's DOCUMENTED limits at the lowest level, so no caller can ever
 * trigger error #131009 ("Body text length invalid") again:
 *
 *   • text message body ............ 1 – 4096 chars
 *   • interactive reply-button body  1 – 1024 chars
 *   • reply buttons ................ max 3, title max 20 chars, unique titles
 *   • typing indicator ............. status=read + typing_indicator (≤ 25 s)
 *   • media download URL ........... expires after 5 minutes
 */

export const WA_GRAPH_VERSION = (process.env.WHATSAPP_GRAPH_VERSION || 'v26.0').trim();

export const WA_LIMITS = Object.freeze({
  TEXT_BODY: 4096,
  TEXT_CHUNK: 3800,          // safety margin under 4096
  BUTTON_BODY: 1024,
  BUTTON_BODY_SAFE: 1000,    // safety margin under 1024
  BUTTON_TITLE: 20,
  BUTTONS: 3,
  FOOTER: 60
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const codepoints = (s) => Array.from(String(s ?? ''));

/** Clip to n characters (code-point safe, so emoji are never cut in half). */
export function clip(s, n) {
  const a = codepoints(s);
  return a.length <= n ? a.join('') : a.slice(0, Math.max(0, n - 1)).join('') + '…';
}

/** Split long text on paragraph / line / word boundaries into WhatsApp-safe chunks. */
export function splitText(text, max = WA_LIMITS.TEXT_CHUNK) {
  const t = String(text ?? '').trim();
  if (!t) return [];
  if (t.length <= max) return [t];
  const out = [];
  let rest = t;
  while (rest.length > max) {
    let cut = rest.lastIndexOf('\n\n', max);
    if (cut < max * 0.5) cut = rest.lastIndexOf('\n', max);
    if (cut < max * 0.5) cut = rest.lastIndexOf(' ', max);
    if (cut < max * 0.5) cut = max;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}

/** Return a copy of an interactive payload that is guaranteed to be within Meta's limits. */
export function clampInteractive(interactive) {
  const i = JSON.parse(JSON.stringify(interactive || {}));
  if (i.type === 'button') {
    const body = String(i.body?.text ?? '').trim();
    i.body = { text: body ? clip(body, WA_LIMITS.BUTTON_BODY_SAFE) : 'Choose an option' };
    const seen = new Set();
    i.action = i.action || {};
    i.action.buttons = (i.action.buttons || [])
      .filter((b) => b?.reply?.id)
      .slice(0, WA_LIMITS.BUTTONS)
      .map((b) => {
        let title = clip(b.reply.title || 'Option', WA_LIMITS.BUTTON_TITLE).trim();
        while (seen.has(title)) title = clip(title + '.', WA_LIMITS.BUTTON_TITLE);
        seen.add(title);
        return { type: 'reply', reply: { id: String(b.reply.id).slice(0, 256), title } };
      });
    if (i.footer?.text) i.footer = { text: clip(i.footer.text, WA_LIMITS.FOOTER) };
  }
  return i;
}

/** Turn any caller-supplied response into an array of valid Graph API payloads. */
export function buildPayloads(to, responseData) {
  const base = { messaging_product: 'whatsapp', recipient_type: 'individual', to };

  if (responseData && typeof responseData === 'object' && responseData.type === 'interactive') {
    return [{ ...base, type: 'interactive', interactive: clampInteractive(responseData.interactive) }];
  }

  let text = '';
  if (typeof responseData === 'string') text = responseData;
  else if (responseData && typeof responseData === 'object') {
    if (typeof responseData.text === 'string') text = responseData.text;
    else if (typeof responseData.text?.body === 'string') text = responseData.text.body;
    else if (typeof responseData.body === 'string') text = responseData.body;
  }
  return splitText(text).map((chunk) => ({
    ...base,
    type: 'text',
    text: { preview_url: false, body: chunk }
  }));
}

async function postGraph(phoneId, token, body, attempt = 1) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  try {
    const res = await fetch(`https://graph.facebook.com/${WA_GRAPH_VERSION}/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctl.signal
    });
    clearTimeout(timer);
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      const id = data.messages?.[0]?.id;
      console.log(`[WhatsApp Outbound Sent] ${body.type || body.status} ${id || ''} -> ${body.to || ''}`);
      return { ok: true, id };
    }

    const e = data.error || {};
    console.error(
      `[WhatsApp Graph API Error] http=${res.status} code=${e.code} sub=${e.error_subcode || ''} ` +
      `msg="${e.message || ''}" details="${e.error_data?.details || ''}" type=${body.type || body.status}`
    );
    if (e.code === 190) {
      console.error('[WhatsApp] ACCESS TOKEN INVALID/EXPIRED — regenerate WHATSAPP_API_TOKEN (use a System User permanent token).');
    }
    const retryable = res.status >= 500 || res.status === 429 || [130429, 131056].includes(e.code);
    if (retryable && attempt < 3) {
      await sleep(1200 * attempt);
      return postGraph(phoneId, token, body, attempt + 1);
    }
    return { ok: false, error: e };
  } catch (err) {
    clearTimeout(timer);
    console.error(`[WhatsApp Send Error] ${err.name === 'AbortError' ? 'timeout (15s)' : err.message}`);
    if (attempt < 3) {
      await sleep(800 * attempt);
      return postGraph(phoneId, token, body, attempt + 1);
    }
    return { ok: false, error: { message: err.message } };
  }
}

function resolveCreds({ phoneNumberId, apiToken } = {}) {
  const token = (apiToken || process.env.WHATSAPP_API_TOKEN || '').trim();
  const phoneId =
    String(phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '1395576280301583')
      .trim()
      .replace(/\D/g, '') || '1395576280301583';
  return { token, phoneId };
}

/** Send a text / interactive message. Always safe w.r.t. Meta's documented limits. */
export async function sendWhatsAppMessage({ to, responseData, phoneNumberId, apiToken }) {
  const { token, phoneId } = resolveCreds({ phoneNumberId, apiToken });
  if (!token) {
    console.warn('[WhatsApp Outbound] Cannot send: WHATSAPP_API_TOKEN not configured.');
    return { ok: false, error: { message: 'NO_TOKEN' } };
  }
  const cleanTo = String(to || '').replace(/\D/g, '');
  if (!cleanTo) return { ok: false, error: { message: 'NO_RECIPIENT' } };

  const payloads = buildPayloads(cleanTo, responseData);
  const ids = [];
  for (const p of payloads) {
    const r = await postGraph(phoneId, token, p);
    if (!r.ok) return r;
    ids.push(r.id);
  }
  return { ok: true, ids };
}

/**
 * Mark the inbound message as read AND show "typing…" (documented: lasts until the
 * next outbound message or ~25 s). Fire-and-forget: failures never block the answer.
 */
export async function sendTypingIndicator(messageId, opts = {}) {
  if (!messageId || String(messageId).startsWith('btn_')) return;
  const { token, phoneId } = resolveCreds(opts);
  if (!token) return;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 5000);
  try {
    await fetch(`https://graph.facebook.com/${WA_GRAPH_VERSION}/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
        typing_indicator: { type: 'text' }
      }),
      signal: ctl.signal
    });
  } catch {
    /* non-critical */
  } finally {
    clearTimeout(timer);
  }
}
