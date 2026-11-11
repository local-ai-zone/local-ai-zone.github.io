# Design: Mistral Large 4 (Le Chonk) deep-dive post

Date: 2026-10-07 · Status: approved in conversation · Owner: Local AI Zone (`blog/`)

## Goal

Publish a full-length technical deep dive on Mistral Large 4 — the model Mistral
previewed on 2026-10-06 and that dominated coverage on 2026-10-07 — with an
explicit "can you run it locally?" analysis appropriate to this site's readers.

## Decisions already made

| Decision | Choice |
| --- | --- |
| Angle | Full technical deep dive **plus** a dedicated local-run section |
| Length | ~6,000 words: 10 numbered sections + a Bottom Line + FAQ |
| Speculation | Concrete size/hardware estimates, every figure labelled as an estimate pending weights |
| Approach | Template-donor: `blog/glm-5-3-flash-deep-dive.html` is the structural skeleton |
| Design approval | Given in conversation before any file was written |

## Post identity

- **File:** `blog/mistral-large-4-deep-dive.html`
- **Title (and `<title>`):** Mistral Large 4 (Le Chonk): A 1 Trillion-Parameter Deep Dive
- **Banner `<h1>`:** Mistral Large 4: 1 Trillion Parameters, 49 Billion Active — Inside Le Chonk
- **Canonical/URL:** `https://local-ai-zone.github.io/blog/mistral-large-4-deep-dive.html`
- **Published:** 2026-10-07; body states the preview was announced 2026-10-06
- **Hero:** `blog/mistral-large-4-deep-dive-hero.png`, 1200x630, registered in
  `scripts/generate-post-images.js`

## Structure (inherited from the donor)

Head and metadata (self-referential: canonical, og:url, twitter:url,
JSON-LD `mainEntityOfPage`, breadcrumb last item) → JSON-LD `Article` +
`BreadcrumbList` + `FAQPage` → hero in all three image slots with
`og:image:width/height` and alt text → visible content in this order:

1. What Mistral Large 4 actually is — API-only public preview, guardrails, weights end of month
2. Architecture — 1T total / 49B active, natively multimodal; what Mistral has and has not published
3. Benchmarks — cyber (Artificial Analysis Cyber Index top-5, 82% reproduce-and-patch, 93% Cybench), coding (DeepSWE v1.1 61.7%, SWE-Atlas-QnA 59.4%, Terminal-Bench 4 28.3%, Coding Agent Index 49.8%, blind human eval 3.74/5), agents (AutomationBench 59.9%, AA-Briefcase 1,393 Elo), multimodal (Dense 200 42% vs GPT-6-Astra 41%), science (SciCode-Verified open-weight SOTA), knowledge work (HarveyAI legal, FinWorkBench), safety (Lakera B3 93.3%, KORA 1.691)
4. Training and RL at scale — 3,800 NVIDIA Grace Blackwell GPUs in Mistral's European datacenters, ~33B tokens/day across a 3k-GPU RL fleet
5. Inference and deployment — preview API on Mistral Studio, end-to-end European region, Mistral Forge customization
6. **Can you run it locally?** — labelled estimates (≈2 TB at FP16, ≈1 TB at 8-bit, ≈500 GB at 4-bit before KV cache), MoE expert offload and multi-GPU implications, what to watch when the GGUFs land, what open-weight models to run meanwhile
7. API and developer usage
8. Safety, red-teaming and the open-by-design argument
9. Strategic context — €3B Series D, ASML and Samsung backing, 160+ training languages
10. What is still missing
11. Bottom line

Then: visible FAQ (5-6 Q&A matching the `FAQPage` schema word-for-word),
Related Posts, About the Author, contact CTA card, site-wide contact form.

## Sourcing rules

Every figure is traced to one of: Mistral's own announcement
(`mistral.ai/news/mistral-large-4/`), TechCrunch 2026-10-06, Reuters 2026-10-06.
Anything not published (architecture detail, pricing, license, quant sizes) is
labelled as unpublished or an estimate. The local-run numbers are arithmetic
from the announced parameter counts and must say so.

## Wiring

1. Hero: registry entry in `scripts/generate-post-images.js`, rendered with the
   locally cached Chrome; all three image slots point at it
2. `python scripts/add-post-cta.py` injects the CTA and contact form with
   subject `Help with: Mistral Large 4 (Le Chonk)`
3. `blog.html` card + JSON-LD entry; new entries in `sitemap.xml` and `feed.xml`

## Verification gates (must all pass)

- `python scripts/audit-posts.py` → 0 problems (dead links, identity reuse, FAQ
  schema vs visible FAQ, read-time and `wordCount` within tolerance of the real body)
- `python scripts/check-post-heroes.py` → 0 errors (registry, PNG dimensions,
  three image slots agreeing, no site-wide fallback)
- `python tests/run_all.py` → 56 tests pass

## Risks

- Hero rendering needs the cached Chrome; if it fails the post cannot pass
  `check-post-heroes.py` and the blockage must be reported rather than worked around
- Donor-specific leftovers (dates, "Last Updated", unrelated cross-links) must be
  rewritten or the audit's identity checks fail
- The repo's `npm test` is already broken for pre-existing reasons (gitignored
  `models/*-test.html` pages, unparseable shard test); the three gates above are
  the acceptance criteria for this work
