import PDFDocument from 'pdfkit';

// 80mm thermal roll: 80mm = 226.77pt wide. Height is measured, so there is no wasted paper.
const W = 226.77;
const M = 12;
const CW = W - M * 2;

const kes = (n) => `KES ${Number(n).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const when = (d) =>
  new Date(d).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' });
const maskPhone = (p) => (p && p.length >= 9 ? `+${p.slice(0, 5)}****${p.slice(-3)}` : `+${p}`);

function rule(doc, dashed = true) {
  const y = doc.y + 3;
  doc.save().lineWidth(0.6).strokeColor('#000');
  if (dashed) doc.dash(2, { space: 2 });
  doc.moveTo(M, y).lineTo(W - M, y).stroke().undash().restore();
  doc.y = y + 6;
}

function row(doc, left, right, { bold = false, size = 8.5 } = {}) {
  const y = doc.y;
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
  doc.text(left, M, y, { width: CW * 0.58, lineBreak: false });
  doc.text(right, M, y, { width: CW, align: 'right', lineBreak: false });
  doc.y = y + size + 3.5;
}

/** Draws the whole receipt; returns final y. Used once to measure, once to render. */
function draw(doc, d) {
  const { businessName, order, items } = d;
  doc.x = M;
  doc.y = 14;

  doc.font('Helvetica-Bold').fontSize(13).text(businessName.toUpperCase(), M, doc.y, { width: CW, align: 'center' });
  doc.font('Helvetica').fontSize(8).text('PAYMENT RECEIPT', M, doc.y + 1, { width: CW, align: 'center' });
  doc.moveDown(0.3);
  rule(doc);

  row(doc, 'Order', order.order_no, { bold: true });
  row(doc, 'Date', when(order.paid_at || order.created_at));
  row(doc, 'Customer', maskPhone(order.wa_id));
  row(doc, 'M-PESA ref', order.mpesa_receipt || '-');
  rule(doc);

  for (const it of items) {
    doc.font('Helvetica-Bold').fontSize(8.5).text(it.name, M, doc.y, { width: CW });
    row(doc, `${it.qty} x ${kes(it.unit_price)}`, kes(it.qty * it.unit_price));
  }
  rule(doc);

  row(doc, 'Subtotal', kes(order.subtotal_kes));
  row(doc, `Delivery (${order.zone_name})`, kes(order.delivery_fee_kes));
  rule(doc, false);
  row(doc, 'TOTAL PAID', kes(order.total_kes), { bold: true, size: 11 });
  row(doc, 'Paid via', 'M-PESA');
  rule(doc);

  doc.font('Helvetica-Bold').fontSize(9).text('THANK YOU FOR YOUR ORDER!', M, doc.y, { width: CW, align: 'center' });
  doc.font('Helvetica').fontSize(7.5).fillColor('#333')
    .text('Reply "Track" on WhatsApp anytime to see your delivery status.', M, doc.y + 2, { width: CW, align: 'center' });
  doc.fillColor('#000');
  return doc.y;
}

/** @returns {Promise<Buffer>} one-page PDF, 80mm wide, auto height. */
export function buildReceiptPdf(data) {
  // Pass 1: measure on a tall scratch page.
  const probe = new PDFDocument({ size: [W, 4000], margin: 0 });
  probe.on('data', () => {});
  const endY = draw(probe, data);
  probe.end();

  // Pass 2: real page with exact height.
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: [W, Math.ceil(endY + 18)],
      margin: 0,
      info: { Title: `Receipt ${data.order.order_no}`, Author: data.businessName },
    });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    draw(doc, data);
    doc.end();
  });
}
