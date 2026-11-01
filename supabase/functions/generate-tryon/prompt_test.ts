import { assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildTryOnPrompt } from './prompt.ts';

Deno.test('try-on prompt strictly preserves face and all non-clothing details', () => {
  const prompt = buildTryOnPrompt([{ name: 'Jacket' }], 'M');
  assertStringIncludes(prompt, 'ONLY PERMITTED CHANGE');
  assertStringIncludes(prompt, 'Keep the exact face and identity');
  assertStringIncludes(prompt, 'facial geometry, eyes, eyebrows, nose, lips');
  assertStringIncludes(prompt, 'hands and fingers, pose, gaze');
  assertStringIncludes(prompt, 'every background object exactly as they are');
  assertStringIncludes(prompt, 'indistinguishable from the input outside the garment areas');
});

Deno.test('try-on prompt aligns garment reference numbering and sizes', () => {
  const prompt = buildTryOnPrompt([
    { name: 'Wool coat', brand: 'North', category: 'outerwear', color: 'navy', referenceIndex: 1, buttoned: true },
    { name: 'Jeans', category: 'bottomwear', tucked: false },
  ], 'L');
  assertStringIncludes(prompt, 'Target fit: relaxed with natural ease (L)');
  assertStringIncludes(prompt, 'match garment reference image 1');
  assertStringIncludes(prompt, 'no garment photo reference supplied');
});