/// <reference path="./generated/models.d.ts" />

import { editImageStream } from 'npm:@lovable.dev/ai-gateway';
import type { ImageEditRequest, ModelList } from 'npm:@lovable.dev/ai-gateway';
import { listModels } from 'npm:@lovable.dev/ai-gateway';

export const TRYON_IMAGE_MODEL = 'openai/gpt-image-2.5-sunburst';
export type TryOnEditRequest = ImageEditRequest & { model: typeof TRYON_IMAGE_MODEL };

export async function assertImageEditModelAvailable() {
  const catalog: ModelList = await listModels();
  if (catalog.workspace_models !== 'included') {
    throw new Error('Workspace image editor availability could not be verified.');
  }
  const model = catalog.data.find((entry) => entry.id === TRYON_IMAGE_MODEL);
  if (!model?.supported_surfaces.includes('image-edit')) {
    throw new Error('The photo-preserving image editor is not currently available for this workspace.');
  }
}

export function createTryOnImageStream(
  payload: Omit<TryOnEditRequest, 'model' | 'stream'>,
) {
  return editImageStream({
    ...payload,
    model: TRYON_IMAGE_MODEL,
  });
}