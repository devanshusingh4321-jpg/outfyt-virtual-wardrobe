# Current roadmap

- [ ] Prepare Capacitor iOS and Android projects for app-store release; owner developer accounts, signing, and submissions remain external steps.
- [x] Improve virtual try-on identity preservation using a high-quality image-edit flow; retain a photo-first composition, garment references, and current private save flow.
- [x] Add Razorpay-backed service checkout with INR amounts, per-customer payment history, and server-side verification.
- [x] Add and deploy the `order.paid` webhook callback endpoint.
- [x] Add Razorpay test API keys through the secure secret form.
- [x] Add a shared Razorpay webhook secret through the secure secret form.
- [ ] Configure Razorpay to send `order.paid` events to the deployed webhook endpoint using the same shared secret.
- [ ] Add the actual service names, descriptions, and INR prices once provided.
- [ ] Verify end-to-end test checkout after credentials and service listings are configured.