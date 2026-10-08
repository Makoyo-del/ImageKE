/**
 * =============================================================================
 * DUNCAN MAKOYO DIGITAL ASSETS STORE • FULL BACKEND TEST SUITE
 * =============================================================================
 */

import {
  digitalProductService,
  storageVaultService,
  paystackGatewayService,
  emailFulfillmentService,
  digitalOrderService,
  supabaseStore
} from './digitalStore.js';
import axios from 'axios';
import crypto from 'crypto';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    testsFailed++;
  }
}

async function runAllTests() {
  console.log('\n=============================================================');
  console.log('🚀 RUNNING DIGITAL STORE BACKEND AUTOMATED TEST SUITE');
  console.log('=============================================================\n');

  try {
    // ─── TEST 1: CATALOG & PRICE VERIFICATION ─────────────────────────────────
    console.log('📌 [TEST SUITE 1] Catalog & Server Price Truth Engine');
    const products = await digitalProductService.getAllActiveProducts();
    assert(Array.isArray(products) && products.length >= 3, `Loaded ${products.length} active products from Supabase.`);

    const debtProduct = products.find((p) => p.product_id === 'debt-freedom-engine');
    const freelanceProduct = products.find((p) => p.product_id === 'freelancer-pricing-os');
    const bundleProduct = products.find((p) => p.product_id === 'complete-financial-os-bundle');

    assert(debtProduct && debtProduct.price_usd === 1.99, 'Debt Freedom Engine USD price verified ($1.99)');
    assert(debtProduct && debtProduct.price_kes === 250, 'Debt Freedom Engine KES price verified (KSh 250)');
    assert(freelanceProduct && freelanceProduct.price_usd === 2.5, 'Freelancer Pricing OS USD price verified ($2.50)');
    assert(bundleProduct && bundleProduct.is_bundle === true, 'Complete Bundle detected with bundle flag');

    // Test Price Calculation Engine
    const usdPrice = digitalProductService.calculateVerifiedPrice(debtProduct, 'USD');
    assert(usdPrice.amount === 1.99 && usdPrice.subunitAmount === 199 && usdPrice.currency === 'USD', 'USD price calculated to 199 cents');

    const kesPrice = digitalProductService.calculateVerifiedPrice(debtProduct, 'KES');
    assert(kesPrice.amount === 250 && kesPrice.subunitAmount === 25000 && kesPrice.currency === 'KES', 'KES price calculated to 25,000 cents (KSh 250)');

    // ─── TEST 2: STORAGE VAULT & SECURE SIGNED URLS ────────────────────────────
    console.log('\n📌 [TEST SUITE 2] Supabase Private Storage Vault & Signed URLs');
    for (const p of [debtProduct, freelanceProduct, bundleProduct]) {
      const signedUrl = await storageVaultService.generateSignedDownloadUrl(p.file_vault_path, 3600);
      assert(signedUrl.includes('token='), `Generated signed token URL for ${p.file_vault_path}`);
      
      // Verify download URL is live and returns HTTP 200 with correct file size
      const res = await axios.head(signedUrl);
      const contentLength = parseInt(res.headers['content-length'] || '0', 10);
      assert(res.status === 200 && contentLength > 1000, `Live signed URL for ${p.name} verified (Size: ${(contentLength / 1024).toFixed(1)} KB)`);
    }

    // ─── TEST 3: PAYSTACK GATEWAY & HMAC VALIDATION ────────────────────────────
    console.log('\n📌 [TEST SUITE 3] Paystack Gateway & Cryptographic Signature');
    const secretKey = process.env.PAYSTACK_SECRET_KEY || 'sk_test_mock';
    const testBody = JSON.stringify({ event: 'charge.success', data: { reference: 'TEST_REF_123' } });
    const realSignature = crypto.createHmac('sha512', secretKey).update(testBody).digest('hex');

    const isValidSig = paystackGatewayService.verifyWebhookSignature(testBody, realSignature);
    assert(isValidSig === true, 'HMAC-SHA512 valid signature verified');

    const isInvalidSig = paystackGatewayService.verifyWebhookSignature(testBody, 'bad_signature_hash');
    assert(isInvalidSig === false, 'HMAC-SHA512 invalid signature correctly rejected');

    // ─── TEST 4: ORDER FULFILLMENT & IDEMPOTENCY ───────────────────────────────
    console.log('\n📌 [TEST SUITE 4] Order Fulfillment, Idempotency & Database Writing');
    const testRef = `DM_TEST_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const testEmail = 'automated_tester@duncanmakoyo.com';

    // Fulfill synthetic order
    const fulfillment1 = await digitalOrderService.fulfillOrder({
      paymentReference: testRef,
      productId: 'debt-freedom-engine',
      customerEmail: testEmail,
      customerName: 'Automated Tester',
      customerPhone: '+254700000000',
      amountPaid: 1.99,
      currency: 'USD',
      paymentStatus: 'completed',
      paymentChannel: 'card',
      ipAddress: '127.0.0.1',
      userAgent: 'Automated Test Suite'
    });

    assert(fulfillment1.isExisting === false, 'New order successfully created and saved in DB');
    assert(fulfillment1.order.order_number.startsWith('DM-2026-'), `Order number formatted correctly: ${fulfillment1.order.order_number}`);
    assert(fulfillment1.order.download_token.length === 48, 'Download token minted with 48-char cryptographic hex');
    assert(fulfillment1.signedDownloadUrl.includes('token='), 'Instant on-screen signed download link generated');

    // Test Idempotency (Submitting same ref again)
    const fulfillment2 = await digitalOrderService.fulfillOrder({
      paymentReference: testRef,
      productId: 'debt-freedom-engine',
      customerEmail: testEmail,
      amountPaid: 1.99,
      currency: 'USD'
    });

    assert(fulfillment2.isExisting === true, 'Idempotency verified: re-submitting same payment reference returns existing order');
    assert(fulfillment2.order.id === fulfillment1.order.id, 'Order ID matches original record (No duplicate database entries)');

    // ─── TEST 5: TOKEN CONSUMPTION & DOWNLOAD TRACKING ────────────────────────
    console.log('\n📌 [TEST SUITE 5] Download Token Consumption & Security');
    const token = fulfillment1.order.download_token;
    const consumed = await digitalOrderService.validateAndConsumeDownloadToken(token);
    assert(consumed.order.product_id === 'debt-freedom-engine', 'Valid token retrieved order successfully');
    assert(consumed.signedUrl.includes('token='), 'Valid token generated direct signed vault URL');

    // Verify download count incremented in DB
    const { data: updatedOrder } = await supabaseStore
      .from('digital_orders')
      .select('download_count, last_downloaded_at')
      .eq('id', fulfillment1.order.id)
      .single();

    assert(updatedOrder.download_count === 1, `Download counter incremented to ${updatedOrder.download_count}`);
    assert(updatedOrder.last_downloaded_at !== null, 'last_downloaded_at timestamp updated');

    // Test Invalid Token
    let invalidTokenCaught = false;
    try {
      await digitalOrderService.validateAndConsumeDownloadToken('fake_nonexistent_token_99999');
    } catch (e) {
      invalidTokenCaught = true;
    }
    assert(invalidTokenCaught, 'Invalid/forged token correctly throws security exception');

    // ─── TEST 6: SELF-HEALING ORDER LOOKUP ────────────────────────────────────
    console.log('\n📌 [TEST SUITE 6] Self-Healing Customer Support Order Lookup');
    const lookupByEmail = await digitalOrderService.lookupOrders(testEmail);
    assert(lookupByEmail.length > 0, `Lookup by email returned ${lookupByEmail.length} orders`);
    assert(lookupByEmail[0].orderNumber === fulfillment1.order.order_number, 'Lookup matches test order number');

    const lookupByRef = await digitalOrderService.lookupOrders(testRef);
    assert(lookupByRef.length === 1, 'Lookup by payment reference returned exact single order');

    // ─── TEST 7: RESEND EMAIL TEMPLATE RENDERING ──────────────────────────────
    console.log('\n📌 [TEST SUITE 7] Email Fulfillment Template Rendering');
    const emailHtml = emailFulfillmentService.buildOrderFulfillmentHtml({
      customerName: 'Duncan Makoyo',
      productName: 'The Debt Freedom Engine (Snowball & Avalanche OS)',
      orderNumber: fulfillment1.order.order_number,
      downloadUrl: `https://duncanmakoyo.com/api/store/download/${token}`,
      googleSheetsUrl: 'https://docs.google.com/spreadsheets/d/sample/copy',
      amountFormatted: '$1.99',
      paymentRef: testRef
    });

    assert(emailHtml.includes(fulfillment1.order.order_number), 'Email HTML contains order number');
    assert(emailHtml.includes('Download Master Asset File'), 'Email HTML contains download CTA button');
    assert(emailHtml.includes('Make a Copy to Google Drive'), 'Email HTML contains Google Sheets copy option');
    assert(emailHtml.includes('$1.99'), 'Email HTML contains exact formatted price');

    // ─── CLEANUP TEST DATA ───────────────────────────────────────────────────
    console.log('\n🧹 Cleaning up test order from database...');
    await supabaseStore.from('digital_orders').delete().eq('payment_reference', testRef);
    console.log('✅ Cleaned up synthetic test order successfully.');

  } catch (err) {
    console.error('\n❌ Uncaught Exception in Test Suite:', err);
    testsFailed++;
  }

  console.log('\n=============================================================');
  console.log(`🏁 TEST SUMMARY: ${testsPassed} PASSED | ${testsFailed} FAILED`);
  console.log('=============================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runAllTests();
