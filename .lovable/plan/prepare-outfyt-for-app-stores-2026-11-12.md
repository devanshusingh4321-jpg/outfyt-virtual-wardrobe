# Prepare Outfyt for app stores

## Goal
Set up native iOS and Android shells around the existing Outfyt web app while preserving its current sign-in, try-on, closet, and payment behavior.

## Work
- Add Capacitor and the iOS/Android platform packages; configure Outfyt’s app identity and production builds to use the compiled app files rather than a temporary preview URL.
- Generate the iOS and Android project scaffolds and confirm their bundle/package identifiers and app display name.
- Document the local build workflow, the developer accounts and signing credentials the owner must supply, and the remaining store-review/submission steps.
- Run available project checks and inspect the generated native project configuration. Do not attempt store uploads or create/sign releases without the owner’s accounts and credentials.

## Technical details
Use the existing Vite build output as Capacitor’s `webDir`; keep platform projects generated from Capacitor configuration. Add a deep-link/auth note if existing web authentication redirects need owner-provided app link settings. Do not embed private credentials or a preview-only server URL in a release configuration.
