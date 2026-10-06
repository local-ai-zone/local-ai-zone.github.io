# Photo slots — capture workflow

Seven posts carry a prepared, commented-out `<figure>` waiting for a **real** screenshot or
photo. Everything except the pixels is already written: the slot knows its filename, its
aspect ratio, its alt text and its caption.

```
python scripts/install-post-photo.py --list      # every slot, and whether it is filled
python scripts/install-post-photo.py --check     # validate what is already live
```

| slot | post | target file | what the frame should show |
|---|---|---|---|
| `dispatch` | September 2026 dispatch | `september-2026-local-models-dashboard.png` | the model browser's card grid, or a desk shot of the rig |
| `october` | October 2026 dispatch | `october-2026-local-models-dashboard.png` | the model browser filtered/searching the October uploads |
| `kv` | KV cache paper | `deepseek-kv-cache-disk-hit.png` | a serving log showing cache reuse between two turns |
| `ffn` | FFN/MoE paper | `deepseek-moe-expert-parallel-gpus.png` | GPU utilisation during a MoE forward pass |
| `context` | Context management paper | `agent-context-compaction-notes.png` | an agent's notes file beside its context meter |
| `agent` | Build an agent guide | `ai-agent-run-terminal.png` | a real agent run: tool calls, observations, answer |
| `bonsai` | Bonsai 2 27B paper | `bonsai-2-27b-rtx-5090.png` | llama-bench / llama.cpp printing the ternary Bonsai |

## The three-step flow

```bash
# 1. capture (browser pages) or shoot (terminals, hardware)
node scripts/capture-post-screenshots.js --slot=dispatch

# 2. validate, compress and publish it into the post
python scripts/install-post-photo.py --slot=dispatch \
       --file=blog/september-2026-local-models-dashboard.png \
       --alt "..." --caption "..."

# 3. register the new image for image search
node scripts/generate-seo.js
```

The installer checks the frame is landscape and at least 800px wide, warns when it is
below the recommended 1600px or far from 16:9, caps it at 2560px, keeps PNG when it fits
under 400 KB and otherwise re-encodes as progressive JPEG (rewriting the markup to match).
It sets `width`/`height` from the file itself, so the layout never shifts.

Wrong photo? `python scripts/install-post-photo.py --slot=<id> --uninstall` puts the
placeholder back and leaves the image in `blog/`.

## Shooting the frame

- **Terminals:** make the window wide (1600px+) and dark, then `Win`+`Shift`+`S` → drag a
  landscape region → the snip is on the clipboard, save it as PNG. Or `Win`+`PrtScn` writes
  a full-screen PNG to `Pictures\Screenshots`.
- **Browser pages:** `capture-post-screenshots.js` is a real headless capture — it serves
  this repo on a throwaway port so pages that fetch `gguf_models.json` work, and it can
  frame any URL, including your local model server or a cloud dashboard:
  ```bash
  node scripts/capture-post-screenshots.js --slot=ffn --url=http://127.0.0.1:8080
  node scripts/capture-post-screenshots.js --slot=agent --url=http://127.0.0.1:8080 \
       --wait-for=".message" --align=".message" --pad=200
  ```
  Useful flags: `--width --height --dpr --wait-for --align --pad --scroll --click --full --settle`.
- **Never fake it.** A staged or edited terminal is worse than an empty slot: if a frame
  would misrepresent hardware or a benchmark, either shoot the real thing or leave the
  placeholder in place (an empty slot is invisible to readers).

## Slot recipes

### `dispatch` — the card grid, not the landing hero
```bash
node scripts/capture-post-screenshots.js --slot=dispatch
```
Serves this checkout, loads `index.html`, waits for `.premium-model-card`, realigns until the
card grid actually sits 240px down the viewport, then shoots 1600×900.

**Read the tool's report before publishing.** It prints how many cards are *visible* in the
frame, which ones, and the final `scrollY`. `0/60 model cards visible` or `scrollY 0` means the
shot framed the landing hero — which is not what this slot's caption describes. (An earlier
attempt shipped the hero by mistake; that report exists so it cannot happen twice.)

### `october` — the same grid, filtered to the October uploads
```bash
node scripts/capture-post-screenshots.js --slot=october
```
Same geometry as `dispatch`: serves this checkout, loads `index.html`, waits for
`.premium-model-card` and realigns. What makes this frame different is the *filter* — the
caption is about the October uploads, so type `Qwen3.8 Flash Next` (or `Clef`) into the model
search box on the live page before shooting, or pass `--scroll` to land on a different region,
so the two dispatches do not run the identical picture.

**Read the report before publishing**, exactly as with `dispatch`: `0/N model cards visible`
or `scrollY 0` means it framed the landing hero rather than the grid, and the run should be
discarded rather than captioned.

### `kv` — a cache hit in a serving log
```bash
# 1. any instruct GGUF you already have, served locally
llama-server -m models/<your-model>.gguf -c 8192 --port 8080

# 2. ask something that takes a long prompt, twice (the 2nd is the cache hit)
curl -s http://127.0.0.1:8080/v1/chat/completions -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"<your long prompt>"}],"max_tokens":64}' > /dev/null
# press ↑ then Enter to repeat it verbatim
```
Frame the two log blocks: the first prints a full `prompt eval time`, the second collapses
to near zero because the prefix was reused. That is the honest local equivalent of the
prefix reuse the paper measures. `OLLAMA_DEBUG=1 ollama serve` writes the same thing.

### `ffn` — GPU during a MoE pass
```bash
# pane 1: live utilisation and memory
nvidia-smi --query-gpu=name,utilization.gpu,memory.used,memory.total,power.draw --format=csv -l 1
# pane 2: a real MoE model under load (A3B / MoE builds show the sparsity in the log)
llama-server -m models/<moe-model>.gguf -c 8192 --port 8080
# then send a long generation so utilisation stays high
```
Prefer a frame that shows the model being served *and* the GPU busy at the same time. No
NVIDIA card? Task Manager → Performance → GPU is a valid second choice; a hosted-GPU
console works too via `--url`.

### `context` — notes file beside the context meter
```bash
# Windows Terminal: open an agent in one pane, its notes in the other
claude            # or codex / aider / opencode — any agent that keeps notes or a todo file
# split pane (Alt+Shift+D) then:
while true; do clear; cat NOTES.md; sleep 5; done
```
Frame the moment the agent rewrites its notes — that is compaction happening. If your
agent shows a context/token meter (Claude Code's status line does), include it.

### `agent` — a real agent run, in this repo
```bash
# 1. a local OpenAI-compatible server
llama-server -m models/<your-model>.gguf -c 8192 --port 8080 --jinja
#   (or: ollama serve, then pass --base-url http://127.0.0.1:11434/v1)

# 2. the example loop this guide describes
python scripts/minimal-agent-loop.py --base-url http://127.0.0.1:8080/v1 \
       --model local --task "Create notes.md, list the directory, then summarise what you did."
```
It prints every turn — the model's thought, the tool call, the observation, the final
answer — which is exactly the frame this slot wants. Standard library only, no installs.

### `bonsai` — the throughput claim, on screen
```bash
# find the ternary build in the site's own model browser, download the GGUF, then:
llama-bench -m bonsai2-27b-ternary.gguf -p 512 -n 128
#   tg128 is token-generation throughput — the same protocol the paper cites
# or interactively, with timings printed after the answer:
llama-cli -m bonsai2-27b-ternary.gguf -p "Explain ternary quantisation in one paragraph." -n 200 -st
```
If the hardware in the frame is not the card named in the caption, override it:
`--caption "5.93 GB of weights on one machine: the footprint claim, on screen."`

## After a capture

```bash
python scripts/install-post-photo.py --check      # file, markup and size agree
node scripts/generate-seo.js                      # image sitemap entry
```
