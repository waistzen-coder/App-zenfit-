# Runway Studio Skills — Cookbook

Real-world recipes that show what's possible when you combine Claude's reasoning with Runway's generation API. Each recipe is a complete, runnable example.

---

## Recipe 1 — Product URL to Product Ad Video

**What it does:** Give Claude a product page URL. It scrapes the page for the product image and value propositions, then generates product ad videos across TikTok (9:16), YouTube (16:9), and Instagram (1:1) formats using seedance2.

**Why this is powerful:** One URL in, multi-format ad videos out. No camera, no crew, no editing. seedance2 excels at product videos because it accepts reference images — feed in the actual product photo and it preserves the product's visual identity in the generated video.

**What you say to Claude:**

```
Generate product ad videos for [URL]. Make TikTok (9:16), YouTube (16:9), and Instagram (1:1) formats. Use seedance2.
```

**What Claude does:**

1. Fetches the product URL and extracts: product name, hero image URL, key features, target audience
2. Writes a motion prompt for each format (camera movement + scene description)
3. Runs `generate_video.py` for each format using the product image as the reference

---

### Step-by-step walkthrough

**Step 1 — Extract product info from the URL:**

Claude fetches the page and identifies:
- Product image URL (the main hero/product photo)
- Product name and description
- Key selling points for prompt writing

**Step 2 — Generate ad videos for each format:**

TikTok vertical (9:16):
```bash
uv run scripts/generate_video.py \
  --prompt "Smooth camera orbit around the product, soft studio lighting, clean white background fading to lifestyle setting, elegant product reveal" \
  --image "https://example.com/product-hero.jpg" \
  --model seedance2 \
  --ratio 720:1280 \
  --duration 10 \
  --filename "product-ad-tiktok"
```

YouTube horizontal (16:9):
```bash
uv run scripts/generate_video.py \
  --prompt "Slow dolly push-in on the product, warm golden hour lighting, premium feel, camera settles on a close-up of the product details" \
  --image "https://example.com/product-hero.jpg" \
  --model seedance2 \
  --ratio 1280:720 \
  --duration 10 \
  --filename "product-ad-youtube"
```

Instagram square (1:1):
```bash
uv run scripts/generate_video.py \
  --prompt "Product slowly rotating on a marble pedestal, soft ambient light, clean minimal background, studio photography feel" \
  --image "https://example.com/product-hero.jpg" \
  --model seedance2 \
  --ratio 960:960 \
  --duration 10 \
  --filename "product-ad-instagram"
```

**Step 3 (optional) — Generate multiple variants per format:**

Use `--output-count 4` to get 4 variations in one call:
```bash
uv run scripts/generate_video.py \
  --prompt "Elegant product reveal, soft lighting" \
  --image "https://example.com/product-hero.jpg" \
  --model seedance2 \
  --ratio 720:1280 \
  --duration 10 \
  --output-count 4 \
  --filename "product-ad-tiktok-variant"
```

**Step 4 (optional) — Add voiceover:**

Generate a voiceover script from the product's value props:
```bash
uv run scripts/generate_audio.py tts \
  --prompt "Introducing the all-new Product Name. Designed for comfort. Built to last." \
  --voice Leslie \
  --filename "product-voiceover"
```

---

### Prompt presets for product ads

These are starting-point prompts. Claude should adapt them based on the actual product scraped from the URL.

**Product reveal (works for most products):**
> Smooth camera orbit around the product, soft studio lighting, clean background, premium feel, the product is the hero of the shot

**Lifestyle context (apparel, accessories, food):**
> Product in a real-world setting, natural lighting, person interacting with the product naturally, warm and inviting atmosphere

**Tech/gadget showcase:**
> Dramatic lighting on the product, slow camera push-in revealing details, dark background with accent lighting, futuristic feel

**Beauty/skincare:**
> Close-up of the product with soft bokeh background, dewdrops on the surface, gentle camera movement, spa-like atmosphere, luxurious

**Food/beverage:**
> Product on a styled table setting, steam or condensation visible, warm ambient lighting, appetizing presentation, slow camera dolly

---

### Tips

- **seedance2 is the recommended model for product ads** — it takes the product image as a reference and generates video that preserves the product's actual appearance
- **Prompt the motion, not the product.** The reference image carries the visual identity. Your prompt should describe camera movement, lighting, and scene — not what the product looks like.
- **Start with 10s duration.** seedance2 supports 4-15s; 10s is the sweet spot for short-form ads.
- **Generate variants.** Use `--output-count 4` to get 4 different takes in one API call, then pick the best.
- **Use `--seed` to lock a good result.** Once you find a variant you like, note the seed for reproducible results with prompt tweaks.
- **Square format (960:960) works everywhere.** If you only generate one format, make it square — it works on Instagram, Facebook, and Twitter.

---

*(Recipe 2 — Shop URL to Multi-Product Ad Campaign: coming soon)*
