# Outfyt Premium Fashion-Tech Redesign

## Goal
Replace the superhero-coded experience with an original, cohesive editorial fashion identity while preserving authentication, product extraction, outfits, virtual try-on generation, private photo delivery, saved results, measurements, and navigation.

## Visual direction
- Use the selected **Atelier Ivory** palette: warm ivory surfaces, charcoal type, restrained electric lilac, and soft stone borders.
- Use **Libre Baskerville** for display typography and **IBM Plex Sans** for interface text.
- Follow the selected **cinematic fashion-tech** composition through a magazine-grid structure: large editorial headlines, immersive fashion imagery, precise labels, generous whitespace, and minimal ornament.
- Remove all Spider-Man, Marvel, Sony, vault, web-pattern, crimson/cobalt, neon, film, and character references.

## Build
1. **Design system and shared structure**
   - Replace global tokens, typography, backgrounds, focus states, cards, buttons, inputs, badges, and loading treatment.
   - Add reusable responsive navigation and editorial page-heading patterns so product pages feel like one system.
   - Keep motion lightweight and reduced-motion safe.

2. **Landing page**
   - Replace the current branded film with a real product homepage using “Your next look. Before you buy.”
   - Add direct Try it on and sign-in actions, a clearly labeled sample outfit preview, and the actual three-step workflow.
   - Use a cohesive editorial fashion visual asset without implying it is a user-generated result.

3. **Core product pages**
   - Redesign Login, Dashboard, Try-On, Closet, Measurements, and Outfit Builder around the same magazine-grid identity.
   - Make the try-on workspace clearer across upload, outfit selection, options, generation, comparison, save, download, error, and retry states.
   - Preserve all existing database, storage, auth, extraction, and AI calls unchanged.

4. **Supporting surfaces and copy**
   - Update reset password, loading, product cards, fit score, suggestions, empty states, and navigation copy.
   - Remove every remaining superhero or security-vault phrase while keeping labels accurate to real functionality.

5. **Verification**
   - Run the project checks and targeted tests.
   - Verify landing, authentication, and authenticated product flows in the browser at desktop and mobile widths.
   - Check keyboard focus, labels, reduced motion, image states, and horizontal overflow.

## Scope guardrails
- No invented testimonials, usage numbers, fake progress, or unsupported capabilities.
- No backend schema, credentials, API contracts, or working business logic changes.
- Existing user assets and generated results remain private and are never presented as samples.
