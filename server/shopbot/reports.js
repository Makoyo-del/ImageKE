import PDFDocument from 'pdfkit';

const kes = (n) => `KES ${Number(n || 0).toLocaleString('en-KE')}`;
const nairobi = (d) =>
  new Date(d).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' });
const maskPhone = (p) => (p && p.length >= 9 ? `+${p.slice(0, 5)}****${p.slice(-3)}` : `+${p || ''}`);

/**
 * Builds an Executive Sales & Operations PDF Report for Today or This Week.
 * Designed for archival before 8-day Supabase database prune.
 */
export async function buildSalesReportPdf({ period = 'today', pool, businessName = 'Makoyocart Ventures' }) {
  const now = new Date();
  const eatOffset = 3 * 3600 * 1000;
  const nowEat = new Date(now.getTime() + eatOffset);

  let startTimeUtc;
  let periodTitle;
  let dateRangeStr;

  if (period === 'week') {
    const dayOfWeek = nowEat.getUTCDay();
    const diffToMon = (dayOfWeek + 6) % 7;
    const weekStartEat = new Date(nowEat);
    weekStartEat.setUTCDate(weekStartEat.getUTCDate() - diffToMon);
    weekStartEat.setUTCHours(0, 0, 0, 0);
    startTimeUtc = new Date(weekStartEat.getTime() - eatOffset);
    periodTitle = 'WEEKLY OPERATIONS & SETTLEMENT REPORT';
    dateRangeStr = `${weekStartEat.toISOString().slice(0, 10)} to ${nowEat.toISOString().slice(0, 10)} (East Africa Time)`;
  } else {
    const todayStartEat = new Date(nowEat);
    todayStartEat.setUTCHours(0, 0, 0, 0);
    startTimeUtc = new Date(todayStartEat.getTime() - eatOffset);
    periodTitle = 'DAILY OPERATIONS & SETTLEMENT REPORT';
    dateRangeStr = `${todayStartEat.toISOString().slice(0, 10)} (East Africa Time)`;
  }

  // 1. Fetch Orders in period
  const { rows: orders } = await pool.query(
    `select o.id, o.order_no, o.wa_id, c.name as customer_name, o.zone_name,
            o.total_kes::float, o.subtotal_kes::float, o.delivery_fee_kes::float,
            o.payment_status, o.fulfillment_status, o.mpesa_receipt,
            o.created_at, o.paid_at,
            (select string_agg(oi.qty || ' x ' || oi.name, '; ') from shop.order_items oi where oi.order_id = o.id) as items_summary
       from shop.orders o
       left join shop.customers c on c.wa_id = o.wa_id
      where o.created_at >= $1
      order by o.created_at desc`,
    [startTimeUtc]
  );

  // 2. Fetch Product Sales Breakdown
  const { rows: itemSales } = await pool.query(
    `select oi.name, oi.unit_price::float, sum(oi.qty)::int as total_qty, sum(oi.qty * oi.unit_price)::float as total_rev
       from shop.order_items oi
       join shop.orders o on o.id = oi.order_id
      where o.created_at >= $1 and o.payment_status = 'paid'
      group by oi.name, oi.unit_price
      order by total_rev desc`,
    [startTimeUtc]
  );

  // 3. Compute Metrics
  const paidOrders = orders.filter((o) => o.payment_status === 'paid');
  const grossRevenue = paidOrders.reduce((acc, o) => acc + (o.total_kes || 0), 0);
  const paystackFee = Math.round(grossRevenue * 0.015);
  const netEarnings = grossRevenue - paystackFee;
  const dispatchedCount = paidOrders.filter((o) => o.fulfillment_status === 'dispatched' || o.fulfillment_status === 'delivered').length;
  const deliveredCount = paidOrders.filter((o) => o.fulfillment_status === 'delivered').length;
  const aov = paidOrders.length > 0 ? Math.round(grossRevenue / paidOrders.length) : 0;
  const totalUnitsSold = itemSales.reduce((acc, it) => acc + (it.total_qty || 0), 0);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 36,
      info: {
        Title: `${periodTitle} - ${businessName}`,
        Author: 'Duncan Makoyo Workspace',
        Subject: 'Executive Sales & Operations Statement'
      }
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const M = 36;
    const PW = 595.28;
    const CW = PW - M * 2; // 523.28 pt

    // ─── Header ─────────────────────────────────────────────────────────────
    doc.save();
    // Top colored banner bar
    doc.rect(M, doc.y, CW, 4).fill('#7c3aed');
    doc.y += 12;

    doc.font('Helvetica-Bold').fontSize(16).fillColor('#0f172a').text(businessName.toUpperCase(), M, doc.y);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#7c3aed').text(periodTitle, M, doc.y + 2);
    doc.font('Helvetica').fontSize(9).fillColor('#64748b').text(`Period: ${dateRangeStr}  •  Generated: ${nairobi(now)}`, M, doc.y + 2);
    doc.restore();

    doc.moveDown(0.8);

    // Archival Notice Box
    const noticeY = doc.y;
    doc.save()
      .roundedRect(M, noticeY, CW, 24, 4)
      .fillAndStroke('#f8fafc', '#e2e8f0');
    doc.font('Helvetica').fontSize(7.5).fillColor('#475569')
      .text('📌 NOTE: Live order records in PostgreSQL are archived & automatically pruned after 8 days. This verified statement serves as official financial record.', M + 8, noticeY + 7, { width: CW - 16 });
    doc.restore();
    doc.y = noticeY + 32;

    // ─── KPI Cards Grid ─────────────────────────────────────────────────────
    const kpiY = doc.y;
    const cardW = (CW - 24) / 4;
    const cardH = 50;

    const kpis = [
      { label: 'GROSS SALES', value: kes(grossRevenue), sub: `${paidOrders.length} paid orders`, color: '#0f172a' },
      { label: 'EST. NET (98.5%)', value: kes(netEarnings), sub: `Fee: ${kes(paystackFee)}`, color: '#16a34a' },
      { label: 'AVG ORDER VALUE', value: kes(aov), sub: `${totalUnitsSold} items sold`, color: '#7c3aed' },
      { label: 'FULFILLED', value: `${dispatchedCount} / ${paidOrders.length}`, sub: `${deliveredCount} delivered`, color: '#0284c7' },
    ];

    kpis.forEach((kpi, idx) => {
      const cx = M + idx * (cardW + 8);
      doc.save()
        .roundedRect(cx, kpiY, cardW, cardH, 5)
        .fillAndStroke('#f1f5f9', '#cbd5e1');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#64748b').text(kpi.label, cx + 8, kpiY + 8);
      doc.font('Helvetica-Bold').fontSize(12).fillColor(kpi.color).text(kpi.value, cx + 8, kpiY + 20);
      doc.font('Helvetica').fontSize(7).fillColor('#64748b').text(kpi.sub, cx + 8, kpiY + 36);
      doc.restore();
    });

    doc.y = kpiY + cardH + 16;

    // ─── Product Sales Breakdown Table ──────────────────────────────────────
    if (itemSales.length > 0) {
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text('TOP PRODUCTS SOLD IN THIS PERIOD', M, doc.y);
      doc.y += 6;

      const tblY = doc.y;
      doc.save().rect(M, tblY, CW, 16).fill('#e2e8f0').restore();
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e293b');
      doc.text('PRODUCT / VARIANT', M + 6, tblY + 4, { width: 260 });
      doc.text('UNIT PRICE', M + 270, tblY + 4, { width: 80, align: 'right' });
      doc.text('UNITS SOLD', M + 360, tblY + 4, { width: 60, align: 'right' });
      doc.text('TOTAL REVENUE', M + 430, tblY + 4, { width: 86, align: 'right' });
      doc.y = tblY + 18;

      itemSales.slice(0, 8).forEach((it, idx) => {
        const rowY = doc.y;
        if (idx % 2 === 1) {
          doc.save().rect(M, rowY, CW, 16).fill('#f8fafc').restore();
        }
        doc.font('Helvetica').fontSize(8).fillColor('#334155');
        doc.text(it.name, M + 6, rowY + 4, { width: 260, lineBreak: false });
        doc.text(kes(it.unit_price), M + 270, rowY + 4, { width: 80, align: 'right' });
        doc.text(String(it.total_qty), M + 360, rowY + 4, { width: 60, align: 'right' });
        doc.font('Helvetica-Bold').text(kes(it.total_rev), M + 430, rowY + 4, { width: 86, align: 'right' });
        doc.y = rowY + 16;
      });

      doc.y += 14;
    }

    // ─── Detailed Orders Ledger Table ───────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text(`ORDER AUDIT LEDGER (${orders.length} TOTAL RECORDS)`, M, doc.y);
    doc.y += 6;

    const ordTblY = doc.y;
    doc.save().rect(M, ordTblY, CW, 16).fill('#0f172a').restore();
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff');
    doc.text('ORDER #', M + 4, ordTblY + 4, { width: 65 });
    doc.text('TIME (EAT)', M + 72, ordTblY + 4, { width: 70 });
    doc.text('CUSTOMER', M + 144, ordTblY + 4, { width: 65 });
    doc.text('ITEMS & ZONE', M + 212, ordTblY + 4, { width: 145 });
    doc.text('M-PESA REF', M + 360, ordTblY + 4, { width: 65 });
    doc.text('TOTAL', M + 428, ordTblY + 4, { width: 50, align: 'right' });
    doc.text('STATUS', M + 482, ordTblY + 4, { width: 40, align: 'right' });
    doc.y = ordTblY + 18;

    if (orders.length === 0) {
      doc.font('Helvetica').fontSize(8).fillColor('#64748b').text('No orders placed in this time window.', M + 8, doc.y + 6);
      doc.y += 24;
    } else {
      orders.forEach((o, idx) => {
        // Auto page break check
        if (doc.y > 750) {
          doc.addPage();
          doc.y = M;
        }

        const rowY = doc.y;
        if (idx % 2 === 1) {
          doc.save().rect(M, rowY, CW, 18).fill('#f8fafc').restore();
        }

        doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#0f172a');
        doc.text(o.order_no, M + 4, rowY + 4, { width: 65, lineBreak: false });

        doc.font('Helvetica').fontSize(7).fillColor('#475569');
        doc.text(nairobi(o.created_at).slice(0, 16), M + 72, rowY + 4, { width: 70, lineBreak: false });

        doc.text(maskPhone(o.wa_id), M + 144, rowY + 4, { width: 65, lineBreak: false });

        const itemStr = `${o.items_summary || '1 Item'} (${o.zone_name || 'Pickup'})`;
        doc.text(itemStr.slice(0, 36), M + 212, rowY + 4, { width: 145, lineBreak: false });

        doc.font('Helvetica-Bold').fillColor(o.mpesa_receipt ? '#15803d' : '#94a3b8');
        doc.text(o.mpesa_receipt || 'UNPAID', M + 360, rowY + 4, { width: 65, lineBreak: false });

        doc.font('Helvetica-Bold').fillColor('#0f172a');
        doc.text(kes(o.total_kes), M + 428, rowY + 4, { width: 50, align: 'right' });

        const statusColor = o.payment_status === 'paid' ? '#15803d' : '#b45309';
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor(statusColor);
        doc.text(o.payment_status.toUpperCase(), M + 482, rowY + 4, { width: 40, align: 'right' });

        doc.y = rowY + 18;
      });
    }

    // ─── Footer ─────────────────────────────────────────────────────────────
    doc.y = Math.max(doc.y + 12, 780);
    doc.save().strokeColor('#cbd5e1').lineWidth(0.5).moveTo(M, doc.y).lineTo(PW - M, doc.y).stroke().restore();
    doc.font('Helvetica').fontSize(7.5).fillColor('#94a3b8')
      .text('Duncan Makoyo Workspace  •  Makoyocart Operations Center  •  Official Business Telemetry Export', M, doc.y + 6, { width: CW, align: 'center' });

    doc.end();
  });
}
