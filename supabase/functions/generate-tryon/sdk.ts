import { editImageStream } from 'npm:@lovable.dev/ai-gateway';
import type { ImageEditRequest } from 'npm:@lovable.dev/ai-gateway';

export const TRYON_IMAGE_MODEL = 'openai/gpt-image-2.5-sunburst';
export type TryOnEditRequest = ImageEditRequest & { model: typeof TRYON_IMAGE_MODEL };

export function createTryOnImageStream(
  payload: Omit<TryOnEditRequest, 'model' | 'stream'>,
) {
  return editImageStream({
    ...payload,
    model: TRYON_IMAGE_MODEL,
  });
}