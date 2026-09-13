# AI Style Lab

Create a modern AI-powered fashion web app called “OUTFYT”.

Tagline:
“Build Your Drip.”

Brand Vibe:
OUTFYT is a Gen-Z fashion-tech platform where users can build, mix, and try full outfits using clothing links from any brand. The experience should feel modern, bold, smooth, and slightly futuristic.

Tone:
Confident, minimal, aesthetic, social-media ready.

------------------------------------------------
CORE FUNCTION
------------------------------------------------

Users can:
- Paste a clothing product link from any brand (Amazon, Myntra, Zara, Nike, H&M, etc.)
- Upload a full-body photo
- Select size and fit preference
- Add multiple clothing items to build a full outfit
- Get intelligent size recommendations
- See realistic AI-generated try-on results

------------------------------------------------
MAIN FEATURES
------------------------------------------------

1. Universal Link Input
- Extract product image, category, sizes, colors
- Detect clothing type (topwear, bottomwear, outerwear, footwear)
- Extract size chart table

2. Smart Size Engine
- Analyze brand-specific size charts
- Ask user for:
  - Chest
  - Waist
  - Height
  - Fit preference (Tight / Regular / Relaxed)
- Recommend best size for that specific item
- Show confidence percentage

3. Fit Score System
- Compare user measurements with garment measurements
- Display:
  - Overall Fit Score (0–100%)
  - Chest Fit Indicator
  - Waist Fit Indicator
  - Length Fit Indicator
- Show Return Risk level (Low / Medium / High)

4. AI Virtual Try-On
- Upload full-body image
- Pose detection & alignment
- Background removal of garment
- Realistic clothing mapping
- Maintain face unchanged
- Basic fabric fold & lighting simulation

5. Size Simulation
- XS, S, M, L, XL dropdown
- Visually simulate tight / regular / oversized

6. Multi-Color Preview

7. Layered Outfit Builder
- Add multiple product links
- Automatically place clothing in correct body zone
- Support full outfit combinations (shirt + pants + jacket)
- Remove or replace items easily

8. Outfit Comparison Mode

9. AI Styling Assistant
- Suggest matching items
- “Complete The Fit” suggestions

10. Virtual Closet
- Save outfits
- Edit later

11. Before / After Slider

12. Download & Share

13. Affiliate Purchase Integration

------------------------------------------------
UI DESIGN
------------------------------------------------

Style:
- Dark mode by default
- Minimal but bold
- Smooth animations
- Clean layout
- Modern sans-serif font

Colors:
- Primary: Deep Black (#0E0E10)
- Accent: Electric Blue or Neon Purple
- Soft glow effects on buttons

Homepage Structure:
- Hero Section:
  “Build Your Drip With AI.”
- 3 Steps:
  1. Add The Pieces
  2. Pick Your Fit
  3. See The Drip

------------------------------------------------
TECH STACK
------------------------------------------------

Frontend: Next.js + Tailwind CSS
Backend: Python FastAPI

Modules:
- Web scraping engine
- Size chart parser
- Fit score calculator
- Pose detection
- Background removal
- Diffusion-based try-on (mock AI for MVP)
- Layer management system

------------------------------------------------
GOAL
------------------------------------------------

Build a scalable MVP with:
- Complete frontend UI
- Backend API endpoints
- Mock AI logic
- Layered outfit system
- Smart size recommendation engine
- Ready for real AI model integration later

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://outfyt-virtually.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ff07efaa-41b4-4c3e-9aba-2b006c6efca0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
