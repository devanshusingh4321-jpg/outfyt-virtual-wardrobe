

# OUTFYT — "Build Your Drip." 🔥

A Gen-Z fashion-tech platform for building, mixing, and trying outfits using AI.

---

## Phase 1: Foundation & Brand Identity

### Landing Page
- Dark mode design with deep black (#0E0E10) background
- Electric blue/neon purple accent colors with soft glow effects
- Hero section: "Build Your Drip With AI." with animated gradient text
- 3-step visual flow: Add The Pieces → Pick Your Fit → See The Drip
- Smooth scroll animations and modern sans-serif typography
- CTA button to get started

### Authentication
- Sign up / login with email (Lovable Cloud)
- Google OAuth sign-in option
- User profile with saved body measurements

---

## Phase 2: Smart Product Input

### Universal Link Input
- Paste any product URL (Amazon, Myntra, Zara, Nike, H&M, etc.)
- **Firecrawl** scrapes the product page content
- **Lovable AI** parses the scraped data to extract:
  - Product image, name, brand, price
  - Clothing category (topwear, bottomwear, outerwear, footwear)
  - Available sizes and colors
  - Size chart measurements
- Manual input fallback if scraping fails
- Clean product card display with extracted info

---

## Phase 3: Smart Size Engine & Fit Score

### Body Measurements Profile
- One-time setup: chest, waist, hips, height, weight
- Fit preference toggle: Tight / Regular / Relaxed
- Saved to user profile for reuse

### Size Recommendation
- AI analyzes brand-specific size chart against user measurements
- Recommends best size with confidence percentage
- Shows size comparison table

### Fit Score System
- Overall Fit Score (0–100%) with animated gauge
- Individual indicators: Chest Fit, Waist Fit, Length Fit
- Return Risk badge (Low / Medium / High)
- Visual breakdown of how each area fits

---

## Phase 4: Outfit Builder

### Layered Outfit Builder
- Add multiple product links to build a full outfit
- Auto-categorize items into body zones (top, bottom, outerwear, footwear)
- Drag to reorder layers
- Remove or swap items easily
- Visual outfit preview showing all items together

### Multi-Color Preview
- Toggle between available color variants for each item
- See the full outfit update in real-time

### Outfit Comparison Mode
- Side-by-side comparison of two saved outfits
- Swap individual pieces between outfits

---

## Phase 5: AI Styling Assistant

### AI-Powered Suggestions
- "Complete The Fit" — AI suggests matching items based on your current outfit
- Style tips and recommendations using Lovable AI
- Suggestions based on color coordination, style category, and trends

---

## Phase 6: Virtual Try-On (Prepared for AI Integration)

### Try-On Interface
- Upload full-body photo
- Size simulation dropdown (XS → XL) showing tight/regular/oversized
- Before/After slider component
- **MVP**: Overlay-based mockup showing outfit items positioned on the photo
- **Architecture ready** for plugging in real AI try-on APIs (IDM-VTON, etc.) via edge functions

---

## Phase 7: Virtual Closet & Sharing

### Virtual Closet
- Save outfits with custom names
- Browse saved outfits in a grid/gallery view
- Edit outfits later — swap items, change sizes

### Download & Share
- Download outfit image as PNG
- Share-ready card format optimized for social media
- Copy shareable link

---

## Phase 8: Affiliate & Purchase Links

### Purchase Integration
- "Buy This Item" buttons linking back to original product pages
- Affiliate link support (configurable per item)
- Price display for each item and total outfit cost

