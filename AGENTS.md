# Project architecture rules

- Keep payment-provider credentials, order creation, payment verification, and webhook processing in Lovable Cloud server functions; browser code may use only provider-published checkout values because clients can tamper with prices and payment state.