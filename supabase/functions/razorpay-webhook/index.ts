import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const headers = { ...corsHeaders, 'Content-Type': 'application/json' };
const toHex = (bytes: Uint8Array) => [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
const equalHex = (left: string, right: string) => {
  if (!/^[0-9a-f]{64}$/i.test(left) || !/^[0-9a-f]{64}$/i.test(right)) return false;
  const leftBytes = new TextEncoder().encode(left.toLowerCase());
  const rightBytes = new TextEncoder().encode(right.toLowerCase());
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) difference |= leftBytes[index] ^ rightBytes[index];
  return difference === 0;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  try {
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const signature = request.headers.get('x-razorpay-signature');
    if (!webhookSecret || !supabaseUrl || !serviceRoleKey || !signature) {
      console.error('Razorpay webhook is missing server configuration or signature');
      return new Response(JSON.stringify({ error: 'Webhook is not configured.' }), { status: 503, headers });
    }

    const rawBody = await request.text();
    const hmacKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(webhookSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const expectedSignature = toHex(new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(rawBody))));
    if (!equalHex(expectedSignature, signature)) {
      return new Response(JSON.stringify({ error: 'Invalid webhook signature.' }), { status: 401, headers });
    }

    const event: unknown = JSON.parse(rawBody);
    if (!event || typeof event !== 'object' || !('event' in event) || typeof event.event !== 'string' || !('payload' in event)) {
      return new Response(JSON.stringify({ error: 'Invalid webhook payload.' }), { status: 400, headers });
    }
    if (event.event !== 'order.paid') return new Response(JSON.stringify({ received: true }), { headers });

    const payload = event.payload as Record<string, unknown>;
    const orderWrapper = payload.order as { entity?: Record<string, unknown> } | undefined;
    const paymentWrapper = payload.payment as { entity?: Record<string, unknown> } | undefined;
    const razorpayOrderId = orderWrapper?.entity?.id;
    const razorpayPaymentId = paymentWrapper?.entity?.id;
    const paymentOrderId = orderWrapper?.entity?.receipt;
    const amount = paymentWrapper?.entity?.amount;
    const currency = paymentWrapper?.entity?.currency;
    const paymentStatus = paymentWrapper?.entity?.status;
    if (typeof razorpayOrderId !== 'string' || typeof razorpayPaymentId !== 'string' || typeof paymentOrderId !== 'string' || typeof amount !== 'number' || typeof currency !== 'string' || paymentStatus !== 'captured') {
      return new Response(JSON.stringify({ error: 'Order or payment ID is missing.' }), { status: 400, headers });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: order, error: readError } = await supabase
      .from('payment_orders')
      .select('id,amount_paise,currency,status,razorpay_payment_id')
      .eq('razorpay_order_id', razorpayOrderId)
      .maybeSingle();
    if (readError || !order || order.id.replaceAll('-', '') !== paymentOrderId || order.amount_paise !== amount || order.currency !== currency) {
      console.error('Razorpay webhook did not match a recorded payment order:', readError?.message ?? 'Order mismatch');
      return new Response(JSON.stringify({ error: 'Payment order details did not match.' }), { status: 400, headers });
    }
    if (order.status === 'paid') {
      if (order.razorpay_payment_id !== razorpayPaymentId) return new Response(JSON.stringify({ error: 'Order is already paid.' }), { status: 409, headers });
      return new Response(JSON.stringify({ received: true }), { headers });
    }
    const { error } = await supabase.from('payment_orders')
      .update({ status: 'paid', razorpay_payment_id: razorpayPaymentId })
      .eq('id', order.id)
      .eq('status', 'pending');
    if (error) {
      console.error('Could not update payment order from webhook:', error.message);
      return new Response(JSON.stringify({ error: 'Could not record the paid order.' }), { status: 500, headers });
    }

    return new Response(JSON.stringify({ received: true }), { headers });
  } catch (error) {
    console.error('Razorpay webhook failed:', error);
    return new Response(JSON.stringify({ error: 'Invalid webhook request.' }), { status: 400, headers });
  }
});