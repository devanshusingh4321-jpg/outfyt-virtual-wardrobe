import { GatewayError } from 'npm:@lovable.dev/ai-gateway';

function safeRecoveryMessage(error: GatewayError) {
  const recovery = error.recovery?.message;
  if (!recovery) return null;
  return recovery.slice(0, 240);
}

export function gatewayFailureResponse(error: GatewayError, headers: HeadersInit) {
  const status = error.httpStatus ?? 502;
  let message: string;

  if (status === 402) {
    message = safeRecoveryMessage(error) ?? 'AI image credits are exhausted. The workspace owner needs to add credits before generating try-ons.';
  } else if (status === 403) {
    message = `AI image editing is unavailable for this workspace. ${safeRecoveryMessage(error) ?? ''}`.trim();
  } else if (status === 429) {
    const waitSeconds = error.retryAfter ? Math.ceil(error.retryAfter / 1000) : null;
    message = waitSeconds ? `Try-on generation is rate limited. Please try again in about ${waitSeconds} seconds.` : 'Try-on generation is rate limited. Please try again later.';
  } else if (status === 400 || status === 413 || status === 422) {
    message = 'The uploaded images could not be edited. Please check the photo and clothing images and try again.';
  } else if (status === 401) {
    message = 'AI image editing is not configured correctly. Please contact the app owner.';
  } else if (status === 404) {
    message = 'The image editor is unavailable right now.';
  } else {
    message = 'The image editor could not finish the try-on. Please try again later.';
  }

  return new Response(JSON.stringify({ success: false, error: message }), {
    status: status >= 400 && status <= 599 ? status : 502,
    headers,
  });
}

export function gatewayFailureMessage(error: GatewayError) {
  if (error.httpStatus === 402) {
    return safeRecoveryMessage(error) ?? 'AI image credits are exhausted. The workspace owner needs to add credits before generating try-ons.';
  }
  if (error.httpStatus === 403) {
    return `AI image editing is unavailable for this workspace. ${safeRecoveryMessage(error) ?? ''}`.trim();
  }
  if (error.httpStatus === 429) return 'Try-on generation is rate limited. Please try again later.';
  if (error.httpStatus === 400 || error.httpStatus === 413 || error.httpStatus === 422) {
    return 'The uploaded images could not be edited. Please check the photo and clothing images and try again.';
  }
  if (error.httpStatus === 401) return 'AI image editing is not configured correctly. Please contact the app owner.';
  if (error.httpStatus === 404) return 'The image editor is unavailable right now.';
  return 'The image editor could not finish the try-on. Please try again later.';
}