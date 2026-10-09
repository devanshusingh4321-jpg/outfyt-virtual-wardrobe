import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Clock3, CreditCard, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import EditorialNav from "@/components/EditorialNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type ServiceOffering = Pick<Tables<"service_offerings">, "id" | "name" | "description" | "amount_paise" | "currency">;
type PaymentOrder = Pick<Tables<"payment_orders">, "id" | "service_name" | "amount_paise" | "currency" | "status" | "created_at">;
type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (result: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  modal: { ondismiss: () => void };
  theme: { color: string };
};
type RazorpayCheckout = { open: () => void };
type RazorpayConstructor = new (options: RazorpayCheckoutOptions) => RazorpayCheckout;

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
const formatPrice = (amountPaise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amountPaise / 100);

function loadRazorpay(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Checkout is unavailable."));
  if ((window as Window & { Razorpay?: RazorpayConstructor }).Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
    const script = existing ?? document.createElement("script");
    const onLoad = () => resolve();
    const onError = () => reject(new Error("Razorpay checkout could not load. Please try again."));
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existing) {
      script.src = SCRIPT_URL;
      script.async = true;
      document.body.appendChild(script);
    }
  });
}

const Services = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState<ServiceOffering[]>([]);
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const inProgress = useRef(false);
  const pendingPaymentId = searchParams.get("order");

  const loadCustomerData = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    const { data: catalog, error: catalogError } = await supabase
      .from("service_offerings")
      .select("id,name,description,amount_paise,currency")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (catalogError) {
      setPageError("Services could not be loaded right now. Please try again.");
      setLoading(false);
      return;
    }
    setServices((catalog ?? []) as ServiceOffering[]);

    if (user) {
      const { data: customerOrders, error: ordersError } = await supabase
        .from("payment_orders")
        .select("id,service_name,amount_paise,currency,status,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (ordersError) {
        setPageError("Your payment history could not be loaded. Please try again.");
      } else {
        setOrders((customerOrders ?? []) as PaymentOrder[]);
      }
    } else {
      setOrders([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) void loadCustomerData();
  }, [authLoading, loadCustomerData]);

  useEffect(() => {
    if (!pendingPaymentId || !user) return;
    let active = true;
    let attempts = 0;
    const checkPayment = async () => {
      const { data: payment, error } = await supabase
        .from("payment_orders")
        .select("id,status")
        .eq("id", pendingPaymentId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      if (payment?.status === "paid") {
        toast({ title: "Payment confirmed", description: "Your payment is complete." });
        setSearchParams({}, { replace: true });
        await loadCustomerData();
        return;
      }
      if (error || !payment) {
        setPageError("This payment status could not be loaded. Please refresh to try again.");
        return;
      }
      attempts += 1;
      if (attempts < 24) window.setTimeout(() => void checkPayment(), 2500);
    };
    void checkPayment();
    return () => { active = false; };
  }, [loadCustomerData, pendingPaymentId, setSearchParams, toast, user]);

  const startCheckout = async (service: ServiceOffering) => {
    if (!user) {
      const returnTo = `/services?service=${encodeURIComponent(service.id)}`;
      navigate(`/auth?next=${encodeURIComponent(returnTo)}`);
      return;
    }
    if (inProgress.current) return;
    inProgress.current = true;
    setCheckoutId(service.id);
    setPageError(null);

    try {
      const { data, error } = await supabase.functions.invoke("create-razorpay-order", { body: { serviceId: service.id } });
      if (error) {
        const detail = typeof data?.error === "string" ? data.error : error.message;
        throw new Error(detail);
      }
      if (!data?.keyId || !data?.order?.id || !data?.paymentOrder?.id) throw new Error(data?.error ?? "Checkout could not be started.");

      await loadRazorpay();
      const Razorpay = (window as Window & { Razorpay?: RazorpayConstructor }).Razorpay;
      if (!Razorpay) throw new Error("Razorpay checkout is not available. Please try again.");

      const checkout = new Razorpay({
        key: data.keyId,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "Outfyt",
        description: service.name,
        order_id: data.order.id,
        handler: async (result) => {
          const { data: verification, error: verificationError } = await supabase.functions.invoke("verify-razorpay-payment", {
            body: {
              paymentOrderId: data.paymentOrder.id,
              razorpayOrderId: result.razorpay_order_id,
              razorpayPaymentId: result.razorpay_payment_id,
              razorpaySignature: result.razorpay_signature,
            },
          });
          if (verificationError || !verification?.success) {
            setPageError(verification?.error ?? "Payment was submitted but could not be verified yet. Please check your payment history.");
            return;
          }
          setSearchParams({ order: data.paymentOrder.id });
          toast({ title: "Payment submitted", description: "Waiting for Razorpay to confirm your payment." });
        },
        modal: { ondismiss: () => setCheckoutId(null) },
        theme: { color: "#272523" },
      });
      checkout.open();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Checkout could not be started. Please try again.";
      setPageError(message);
      toast({ title: "Checkout unavailable", description: message, variant: "destructive" });
    } finally {
      inProgress.current = false;
      setCheckoutId(null);
    }
  };

  const selectedServiceId = searchParams.get("service");

  return (
    <main className="editorial-page min-h-screen">
      <EditorialNav authenticated={Boolean(user)} />
      <section className="container px-4 py-12 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <p className="eyebrow">Outfyt services</p>
            <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-4xl font-normal leading-tight sm:text-6xl">A little more personal.</h1>
                <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">Explore available services and complete your purchase securely through Razorpay.</p>
              </div>
              {!user && !authLoading && <Button variant="outline" asChild><Link to="/auth?next=%2Fservices">Sign in</Link></Button>}
            </div>
          </motion.div>

          <div aria-live="polite">
            {pendingPaymentId && (
              <div className="mt-8 flex items-start gap-3 border-y border-border py-4 text-sm" role="status">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>Payment submitted. Waiting for Razorpay’s secure confirmation. This may take a moment.</p>
              </div>
            )}
            {pageError && (
              <div className="mt-8 flex flex-col gap-3 border-y border-destructive/40 py-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
                <p className="text-sm text-destructive">{pageError}</p>
                <Button variant="outline" size="sm" onClick={() => void loadCustomerData()}><RefreshCw />Try again</Button>
              </div>
            )}
          </div>

          <section aria-labelledby="available-services" className="mt-12">
            <div className="mb-5 flex items-center justify-between">
              <h2 id="available-services" className="text-2xl font-normal">Available services</h2>
              {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading services" />}
            </div>

            {!loading && services.length === 0 && !pageError && (
              <div className="border-y border-border py-12">
                <p className="eyebrow">Coming soon</p>
                <h3 className="mt-3 text-2xl font-normal">No services are available just yet.</h3>
                <p className="mt-2 text-sm text-muted-foreground">Please check back later.</p>
              </div>
            )}

            <AnimatePresence mode="wait">
              {services.length > 0 && (
                <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {services.map((service) => (
                    <Card key={service.id} className={`flex flex-col border-border shadow-none transition-colors ${selectedServiceId === service.id ? "border-primary" : ""}`}>
                      <CardHeader>
                        <CardDescription>Outfyt service</CardDescription>
                        <CardTitle className="pt-2 text-xl font-normal">{service.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col">
                        <p className="min-h-12 text-sm leading-6 text-muted-foreground">{service.description}</p>
                        <p className="mt-6 font-display text-3xl font-normal">{formatPrice(service.amount_paise)}</p>
                        <Button className="mt-6 w-full" disabled={checkoutId !== null} onClick={() => void startCheckout(service)}>
                          {checkoutId === service.id ? <><Loader2 className="animate-spin" />Preparing checkout</> : <>Continue to payment<ArrowRight /></>}
                        </Button>
                        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" />Secure checkout by Razorpay</p>
                      </CardContent>
                    </Card>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {user && orders.length > 0 && (
            <section aria-labelledby="payment-history" className="mt-16 border-t border-border pt-8">
              <h2 id="payment-history" className="text-2xl font-normal">Your payments</h2>
              <ul className="mt-4 divide-y divide-border">
                {orders.map((order) => (
                  <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div>
                      <p className="font-medium">{order.service_name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm">{formatPrice(order.amount_paise)}</span>
                      <span className="inline-flex items-center gap-1 text-xs capitalize text-muted-foreground">{order.status === "paid" ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <CreditCard className="h-3.5 w-3.5" />}{order.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </section>
    </main>
  );
};

export default Services;