# Razorpay service payments

## Build
- Prepare a secure Razorpay checkout flow for the India-based service business, using INR and requiring a signed-in customer.
- Store service offerings and payment orders in Lovable Cloud; customers can view only active offerings, and each customer can view only their own orders.
- Add server-side order creation, payment-signature verification, and a Razorpay webhook endpoint. Keep API credentials and webhook signing secret server-side; never trust a client-supplied amount.
- Add a services listing, checkout, and payment-result experience using the existing Outfyt design and navigation. Leave the catalog empty until the owner provides actual service names and prices.
- Record the payment architecture rule in `AGENTS.md` and update the task roadmap.

## Setup sequence
1. Apply the database schema and create/deploy the payment endpoints.
2. Ask for Razorpay test API keys through the secure secret form; then configure the shared webhook secret after the callback URL is ready.
3. Ask for service names, descriptions, and INR prices before publishing purchasable offers. Test checkout before switching to live credentials.

## Technical details
- Create tables with explicit grants and row-level security. Only the server can create or change service/order records; public catalog reads expose active offers only.
- Authenticate checkout users; compute prices from the server-side catalog, store amounts in paise, validate Razorpay callback HMAC, and treat verified webhooks as authoritative for paid status.
- Use Razorpay Standard Checkout, with status and error feedback and no simulated success.
