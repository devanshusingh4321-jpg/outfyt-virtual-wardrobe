const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1';
const IMAGE_MODEL = 'openai/gpt-image-2.5-sunburst';

export function editImage(apiKey: string, form: FormData) {
  const streaming = form.get('stream') !== 'false';
  form.set('model', IMAGE_MODEL);
  if (streaming) {
    form.set('stream', 'true');
    if (!form.has('partial_images')) form.set('partial_images', '1');
  } else {
    form.delete('stream');
    form.delete('partial_images');
  }

  return fetch(`${GATEWAY_URL}/images/edits`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
}