export type TryOnGarment = {
  name: string;
  brand?: string | null;
  category?: string | null;
  color?: string | null;
  referenceIndex?: number | null;
  buttoned?: boolean;
  tucked?: boolean;
};

export function buildTryOnPrompt(items: TryOnGarment[], size: string) {
  const fit = size === 'XS' || size === 'S' ? 'close-fitting, but anatomically natural' : size === 'L' || size === 'XL' || size === 'XXL' ? 'relaxed with natural ease' : 'regular true-to-size';
  const descriptions = items.map((item, index) => {
    const details = [item.brand, item.name, item.category ? `category: ${item.category}` : null, item.color ? `requested color: ${item.color}` : null]
      .filter((part): part is string => Boolean(part));
    const styling = [item.buttoned === true ? 'buttoned up' : item.buttoned === false ? 'worn open' : null, item.tucked === true ? 'tucked in' : item.tucked === false ? 'untucked' : null]
      .filter((part): part is string => Boolean(part));
    const reference = item.referenceIndex ? `; match garment reference image ${item.referenceIndex}` : '; no garment photo reference supplied';
    return `${index + 1}. ${details.join(', ')}${reference}${styling.length ? `; styling: ${styling.join(', ')}` : ''}`;
  }).join('\n');

  return `Make a photorealistic virtual clothing try-on by EDITING the first input photograph, not by creating a new photograph.

IMAGE ROLES AND ORDER
- Image 1 is the source photograph of the person. It is the immutable base image and must remain the same person in the same photograph.
- Each following image, in order, is a garment reference for its correspondingly numbered outfit item below. Reference photos show clothing only; do not copy their model, face, body, pose, lighting, crop, or background.

ONLY PERMITTED CHANGE
Replace only the visible clothing worn by the person with these requested items. Use the garment references to faithfully match each item's design, color, pattern, material, collar, sleeves, length, and visible construction. Apply natural fabric folds, occlusion, and lighting consistent with the original source. Target fit: ${fit} (${size}). Respect only the listed styling settings.

LOCK THE SOURCE PHOTOGRAPH
Preserve every pixel outside the clothing edit as closely as possible. Do not retouch, regenerate, beautify, reinterpret, or restyle the person. Keep the exact face and identity: facial geometry, eyes, eyebrows, nose, lips, teeth, ears, skin texture, expression, makeup, and age. Keep hair and hairline, skin tone, body shape and proportions, hands and fingers, pose, gaze, accessories not covered by the new clothes, and all visible anatomy unchanged. Keep the original camera angle, framing, crop, perspective, focus, lighting, color grade, and every background object exactly as they are.

Do not change facial features or any non-clothing element. Do not add objects, people, jewelry, text, logos, or new accessories. Do not crop, expand, mirror, or change the aspect ratio. If a garment is difficult to render, keep the source photograph unchanged in that region rather than modifying the face, body, or background.

OUTFIT TO APPLY
${descriptions}

Return one high-quality photorealistic edit of the original source photo. The result should be indistinguishable from the input outside the garment areas.`;
}