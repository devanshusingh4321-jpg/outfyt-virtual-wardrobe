import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { OperationFailedError, PaymentRequiredError, PermissionDeniedError, RequestRejectedError } from 'npm:@lovable.dev/ai-gateway';
import { gatewayFailureMessage, gatewayFailureResponse } from './errors.ts';

Deno.test('preserves the workspace credit recovery message and HTTP 402 status', async () => {
  const error = new PaymentRequiredError('credits unavailable', {
    httpStatus: 402,
    recovery: { action: 'add_credits', message: 'Add workspace credits before trying again.' },
  });
  const response = gatewayFailureResponse(error, { 'Content-Type': 'application/json' });
  assertEquals(response.status, 402);
  assertEquals((await response.json()).error, 'Add workspace credits before trying again.');
});

Deno.test('preserves the access-denied HTTP 403 status', async () => {
  const error = new PermissionDeniedError('access denied', {
    httpStatus: 403,
    recovery: { action: 'contact_admin', message: 'Ask a workspace admin to review AI access or spending limits.' },
  });
  const response = gatewayFailureResponse(error, { 'Content-Type': 'application/json' });
  assertEquals(response.status, 403);
  assertEquals((await response.json()).error, gatewayFailureMessage(error));
});

Deno.test('does not expose rejected request internals', async () => {
  const error = new RequestRejectedError('private prompt content', { httpStatus: 400 });
  assertEquals(gatewayFailureMessage(error), 'The uploaded images could not be edited. Please check the photo and clothing images and try again.');
});

Deno.test('explains moderation blocks without exposing provider internals', () => {
  const error = new OperationFailedError('private provider response', {
    httpStatus: 200,
    remote: { type: 'image_generation_user_error', code: 'moderation_blocked' },
  });
  assertEquals(
    gatewayFailureMessage(error),
    'This outfit and photo combination was blocked by the image editor’s safety checks. Try a less revealing outfit or a fully clothed source photo. The app cannot override this restriction.',
  );
});

Deno.test('maps unknown errors to a safe gateway response', async () => {
  const error = new OperationFailedError('server failure', { httpStatus: 502 });
  const response = gatewayFailureResponse(error, { 'Content-Type': 'application/json' });
  assertEquals(response.status, 502);
  assertEquals((await response.json()).error, 'The image editor could not finish the try-on. Please try again later.');
});