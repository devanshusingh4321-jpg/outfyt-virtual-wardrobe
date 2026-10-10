import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
const verifyHex = (input: string, expectedHex: string) => {
  if (!/^[0-9a-f]{64}$/i.test(expectedHex)) return false;
  const expected = Uint8Array.from(expectedHex.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
  const supplied = new TextEncoder().encode(input);
  if (expected.length !== supplied.length) return false;
  return expected.every((value, index) => value === supplied[index]);
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: jsonHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey || !razorpayKeySecret) {
      return new Response(JSON.stringify({ error: 'Payment verification is not configured yet.' }), { status: 503, headers: jsonHeaders });
    }

    const authorization = request.headers.get('Authorization');
    if (!authorization) return new Response(JSON.stringify({ error: 'Please sign in to continue.' }), { status: 401, headers: jsonHeaders });
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const token = authorization.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: 'Please sign in to continue.' }), { status: 401, headers: jsonHeaders });

    const payload: unknown = await request.json();
    if (!payload || typeof payload !== 'object' || !('paymentOrderId' in payload) || !('razorpayOrderId' in payload) || !('razorpayPaymentId' in payload) || !('razorpaySignature' in payload) || typeof payload.paymentOrderId !== 'string' || typeof payload.razorpayOrderId !== 'string' || typeof payload.razorpayPaymentId !== 'string' || typeof payload.razorpaySignature !== 'string') {
      return new Response(JSON.stringify({ error: 'The payment details are incomplete.' }), { status: 400, headers: jsonHeaders });
    }

    const { data: order, error: orderError } = await supabase
      .from('payment_orders')
      .select('id,razorpay_order_id,status')
      .eq('id', payload.paymentOrderId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (orderError || !order || order.razorpay_order_id !== payload.razorpayOrderId) {
      return new Response(JSON.stringify({ error: 'The payment order could not be verified.' }), { status: 404, headers: jsonHeaders });
    }
    const hmacKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(razorpayKeySecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(`${payload.razorpayOrderId}|${payload.razorpayPaymentId}`));
    const expectedSignature = [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    if (!verifyHex(expectedSignature, payload.razorpaySignature)) {
      return new Response(JSON.stringify({ error: 'Razorpay could not verify this payment.' }), { status: 400, headers: jsonHeaders });
    }

    if (order.status === 'paid') return new Response(JSON.stringify({ success: true, status: 'paid' }), { headers: jsonHeaders });

    return new Response(JSON.stringify({ success: true, status: 'pending_confirmation' }), { headers: jsonHeaders });
  } catch (error) {
    console.error('Razorpay verification failed:', error);
    return new Response(JSON.stringify({ error: 'Payment verification failed. Please contact support.' }), { status: 500, headers: jsonHeaders });
  }
});