# Project architecture rules

- Keep payment-provider credentials, order creation, payment verification, and webhook processing in Lovable Cloud server functions; browser code may use only provider-published checkout values because clients can tamper with prices and payment state.
- Keep virtual try-on image editing and private-result uploads inside the authenticated Lovable Cloud function; stream only temporary previews and completed signed-URL results to the browser so unpublished output is never treated as a saved result.