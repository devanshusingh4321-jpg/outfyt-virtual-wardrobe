import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

function respond(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!supabaseUrl || !serviceRoleKey || !razorpayKeyId || !razorpayKeySecret) {
      console.error('Razorpay order creation is missing server configuration');
      return respond({ error: 'Payments are not configured yet.' }, 503);
    }

    const authorization = request.headers.get('Authorization');
    if (!authorization) return respond({ error: 'Please sign in to continue.' }, 401);

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const token = authorization.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return respond({ error: 'Please sign in to continue.' }, 401);

    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || !('serviceId' in body) || typeof body.serviceId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.serviceId)) {
      return respond({ error: 'Choose a valid service.' }, 400);
    }

    const { data: service, error: serviceError } = await supabase
      .from('service_offerings')
      .select('id,name,amount_paise,currency')
      .eq('id', body.serviceId)
      .eq('is_active', true)
      .maybeSingle();
    if (serviceError || !service) return respond({ error: 'This service is unavailable.' }, 404);

    const paymentOrderId = crypto.randomUUID();
    const basicAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Basic ${basicAuth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: service.amount_paise,
        currency: service.currency,
        receipt: paymentOrderId.replaceAll('-', '').slice(0, 40),
        notes: { service_id: service.id, user_id: user.id },
      }),
    });
    if (!razorpayResponse.ok) {
      const details = await razorpayResponse.text();
      console.error(`Razorpay order creation failed [${razorpayResponse.status}]: ${details}`);
      return respond({ error: 'Razorpay could not prepare checkout. Please try again.' }, 502);
    }
    const razorpayOrder = await razorpayResponse.json();

    const { data: order, error: insertError } = await supabase
      .from('payment_orders')
      .insert({
        id: paymentOrderId,
        user_id: user.id,
        service_id: service.id,
        service_name: service.name,
        amount_paise: service.amount_paise,
        currency: service.currency,
        razorpay_order_id: razorpayOrder.id,
      })
      .select('id,service_name,amount_paise,currency')
      .single();
    if (insertError || !order) {
      console.error('Could not save Razorpay order record:', insertError?.message ?? 'No order returned');
      return respond({ error: 'Checkout could not be saved. Please try again.' }, 500);
    }

    return respond({ keyId: razorpayKeyId, order: razorpayOrder, paymentOrder: order });
  } catch (error) {
    console.error('Razorpay order request failed:', error);
    return respond({ error: 'Could not start checkout. Please try again.' }, 500);
  }
});