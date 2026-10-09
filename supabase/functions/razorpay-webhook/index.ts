import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const headers = { ...corsHeaders, 'Content-Type': 'application/json' };
const toHex = (bytes: Uint8Array) => [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  try {
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const signature = request.headers.get('x-razorpay-signature');
    const eventId = request.headers.get('x-razorpay-event-id');
    if (!webhookSecret || !supabaseUrl || !serviceRoleKey || !signature) {
      console.error('Razorpay webhook is missing server configuration or signature');
      return new Response(JSON.stringify({ error: 'Webhook is not configured.' }), { status: 503, headers });
    }

    const rawBody = await request.text();
    const hmacKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(webhookSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const expectedSignature = toHex(new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(rawBody))));
    if (signature.length !== expectedSignature.length || !Array.from(expectedSignature).every((character, index) => character === signature[index])) {
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
    if (typeof razorpayOrderId !== 'string' || typeof razorpayPaymentId !== 'string') {
      return new Response(JSON.stringify({ error: 'Order or payment ID is missing.' }), { status: 400, headers });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    let query = supabase.from('payment_orders').update({ status: 'paid', razorpay_payment_id: razorpayPaymentId }).eq('razorpay_order_id', razorpayOrderId);
    if (typeof eventId === 'string' && eventId.length > 0) query = query.eq('id', paymentOrderId as string);
    const { error } = await query;
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