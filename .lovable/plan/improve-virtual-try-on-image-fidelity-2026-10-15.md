# Improve virtual try-on image fidelity

## Goal
Use the highest-quality available image-editing model for virtual try-on and strongly preserve the uploaded person photo, changing the requested garments only.

## Work
- Replace the general image-generation request with the supported image-edit request, using the uploaded photo first and garment references afterward.
- Strengthen the editing instructions to preserve face, identity, hair, expression, skin, body, pose, hands, framing, and background; describe only the requested garment changes.
- Keep authentication, private photo storage, outfit controls, saved-result behavior, and the existing result experience intact.
- Improve request validation and safe error handling; do not report generated results on failed or incomplete responses.

## Technical details
Use the workspace-available quality-focused OpenAI image editor through the existing server-side Lovable AI Gateway and multipart image-edit input. Preserve the existing Supabase Edge Function auth/CORS boundary and signed private-storage output. Verify available request shapes from the bundled image-edit guidance and confirm the preview/build signal after changes. Image generation remains probabilistic, so do not promise pixel-perfect preservation of every non-garment detail.
