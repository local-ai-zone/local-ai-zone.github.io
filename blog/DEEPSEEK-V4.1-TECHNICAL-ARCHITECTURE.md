# DeepSeek V4.1 Flash: Complete Technical Architecture Specification

## Overview
DeepSeek V4.1 Flash is a 552B-parameter multimodal Mixture-of-Experts model with a Causal Encoder-Decoder architecture, released September 10, 2026.

---

## 1. Core Architecture: Causal Encoder-Decoder (CED)

### 1.1 Layer Structure
- **Total layers:** 40 Transformer layers
  - **Encoder:** 20 layers (causal)
  - **Decoder:** 20 layers

### 1.2 Parameter Activation
- **Prefill (input processing):** 8B active parameters
- **Decode (output generation):** 16B active parameters
- **Key innovation:** Decoder's global KV cache is projected from final encoder hidden states, not from each decoder layer's own hidden states

---

## 2. Mixture of Experts (MoE) Configuration

### 2.1 Expert Structure
- **Backbone parameters:** 552B
- **Additional Engram parameters:** 196B (conditional memory)
- **Routed experts per MoE layer:** 384
- **Shared expert per layer:** 1 (always active)
- **Active routed experts per token:** 6 (Top-6 routing)

### 2.2 Gating Mechanism
- **Routing method:** Top-6 expert selection
- **Gating function:** Learned router network selects 6 out of 384 experts per token
- **Load balancing:** Auxiliary loss encourages balanced expert utilization

---

## 3. Attention Architecture: Compressed Sparse Attention 2 (CSA2)

### 3.1 Attention Modes (Static Per-Layer Assignment)
1. **Full Mode**
   - Complete attention across all tokens
   - Used for critical indexing layers
   - Constructs candidate pools for hierarchical indexing

2. **Reindex Mode**
   - Recomputes sparse attention indices
   - Shares main KV cache across layers
   - Reduces memory redundancy

3. **Reuse Mode**
   - Reuses Top-K sparse-attention indices from previous layers
   - Shares both main KV and indexer K across layers
   - Maximum memory efficiency

### 3.2 Hierarchical Sparse Indexer (Decoder Only)
- **First Full Mode layer:** Constructs candidate pool
- **Later indexing layers:** Restricted to this candidate pool
- **Benefit:** Bounds indexer cost independently of context length
- **Critical for:** 1M-token context handling

### 3.3 Attention Pattern
- **Sparse pattern:** Top-K attention with dynamic K selection
- **Index sharing:** Cross-layer reuse in Reindex/Reuse modes
- **Causal masking:** Maintained in both encoder and decoder

---

## 4. KV Cache Architecture

### 4.1 Global KV Cache Size
- **890 bytes per token** (total footprint)
- **Compression vs V4 Flash:** ~1/4 (4× reduction)
- **Compression vs DeepSeek V1:** ~1/437 (437× reduction)

### 4.2 KV Cache Techniques

#### 4.2.1 FP4 Main KV Caching
- **Format:** E2M1 (1 exponent bit, 2 mantissa bits)
- **Scale:** One E4M3 scale per 16 channels
- **Precision:** FP4 for main KV cache (down from FP8 in V4)

#### 4.2.2 Projected Global KV (Decoder)
- **Source:** Final encoder hidden states
- **Method:** Linear projection layer
- **Benefit:** Eliminates per-layer decoder KV storage
- **Impact:** Decoder layers share single global KV cache

#### 4.2.3 Cross-Layer KV Sharing
- **Reindex Mode:** Shares main KV across layers
- **Reuse Mode:** Shares main KV + indexer K
- **Result:** Reduces duplicate storage

#### 4.2.4 SWA Bounded Replay
- **SWA:** Sliding Window Attention
- **Method:** Reconstructs SWA KV states by replaying only the most recent `n_win` tokens
- **Benefit:** Avoids persisting SWA KV to SSD
- **Result:** Persistent KV cache reduced to ~1/8 of V4 Flash

---

## 5. Feed-Forward Network (FFN) Architecture

### 5.1 Single-Pass mHC (Manifold-Constrained Hyper-Connections)
- **Replaces:** Standard residual connections
- **Components:**
  - Revised residual-stream mixing
  - Mega-mHC kernel (efficient single-pass implementation)
  - Manifold-constrained pathways

### 5.2 mHC Benefits
- **Enhanced stability:** Improves signal propagation across layers
- **Preserved expressivity:** Maintains model capacity
- **Efficiency:** Single-pass forward computation

### 5.3 FFN Activation
- **Gate function:** SwiGLU (Swish-Gated Linear Unit)
- **Formula:** `FFN(x) = (xW₁ ⊙ swish(xW₂))W₃`
- **Applied:** Within each MoE expert
- **Swish:** `swish(x) = x · sigmoid(x)`

### 5.4 Expert FFN Structure
- **Per expert:** Independent SwiGLU FFN
- **Shared expert:** Always active with same FFN structure
- **Routed experts:** 6 out of 384 activated per token

---

## 6. Embedding Architecture

### 6.1 Text Embeddings
- **Type:** Learnable token embeddings
- **Vocab size:** Not publicly disclosed
- **Embedding dimension:** Tied to model hidden size
- **Positional encoding:** RoPE (Rotary Position Embeddings) at attention layers

### 6.2 Vision Embeddings (Native Multimodal)

#### Vision Encoder: DeepSeek-ViT
- **Training:** From scratch (not pretrained)
- **Position encoding:** 2D-RoPE for spatial awareness
- **Downsampling:** 3×3 pixel-unshuffle
- **Purpose:** Reduces image resolution before processing

#### Vision Projector
- **Architecture:** Two-layer MLP
- **Input:** Visual features from DeepSeek-ViT
- **Output:** Embeddings in text embedding space
- **Dimension:** Matches text embedding dimension

#### Integration
- **Method:** Visual embeddings concatenated with text embeddings
- **Processing:** Joint processing from start of language model pre-training
- **No separate model:** Single unified architecture for text + vision

### 6.3 Engram Conditional Memory
- **Parameters:** 196B (separate from 552B backbone)
- **Access method:** Token-based lookup (sparse)
- **Not activated:** For every token (only when relevant)
- **Purpose:** External memory for factual knowledge storage and retrieval
- **Gating:** Learned lookup function determines which Engram parameters to access

---

## 7. Gating Mechanisms Summary

| Gating Type | Location | Method | Details |
|------------|----------|--------|---------|
| **Expert Routing** | MoE layers | Top-6 selection | Selects 6/384 routed experts + 1 shared expert |
| **FFN Activation** | Within experts | SwiGLU | `x ⊙ swish(Wx)` |
| **Attention Mode** | CSA2 layers | Static assignment | Full/Reindex/Reuse per layer (not learned) |
| **Engram Access** | Conditional memory | Token-based lookup | Sparse retrieval of relevant parameters |
| **mHC Residual** | Residual connections | Manifold-constrained | Learned gating for residual stream mixing |

---

## 8. Speculative Decoding: DSpark

### 8.1 DSpark Components
- **Method:** Semi-autoregressive draft generation
- **Drafting:** Generates multiple candidate tokens in parallel
- **Verification:** Confidence-scheduled verification of draft tokens
- **Integration:** MHC-aligned block drafting

### 8.2 Gated Residual Reduction
- **Purpose:** Prevents feature misalignment during block speculative decoding
- **Challenge:** mHC's multi-path residual stream requires custom drafting design
- **Solution:** Gated reduction aligns draft features with main model's residual pathway

### 8.3 Confidence Scheduling
- **Adaptive thresholds:** Verification threshold adjusts based on draft confidence
- **Trade-off:** Higher confidence = fewer verifications, faster generation
- **Fallback:** Low-confidence drafts trigger standard autoregressive decoding

---

## 9. Training Details

### 9.1 Pre-training
- **Training corpus:** 45T tokens (multimodal)
- **Sequence length (sparse attention):** 64K tokens
- **Context extension:** Extended to 1M tokens at 34T tokens (progressive scaling)
- **Vision training:** Joint text-vision training from start

### 9.2 Post-training
- **Pipeline:** SFT → RL → On-Policy Distillation (OPD)
- **No algorithmic changes:** Standard pipeline, innovations in data
- **Data innovations:**
  - Large-scale automated synthesis of agent tasks
  - Progressive scaling of data, tasks, and rollouts
  - Agent environment simulation at scale

### 9.3 Reasoning Effort Control
- **Range:** Integer 1–100 (continuously controllable)
- **Trade-off:** Inference cost vs accuracy
- **Implementation:** Likely controls search depth or verification iterations

---

## 10. Inference Specifications

### 10.1 Context and Output
- **Context window:** 1,048,576 tokens (1M)
- **Max output:** 384,000 tokens
- **Modality:** Text + image input, text output

### 10.2 Supported Features
- JSON output ✓
- Tool calls ✓
- OpenAI API format ✓
- Anthropic API format ✓
- Chat Prefix Completion ✓ (Beta)
- FIM (Fill-in-Middle) ✓ (Beta, non-thinking mode only)
- Vision ✓ (native)

### 10.3 Concurrency
- **Limit:** 2,500 concurrent requests
- **Comparison:** V4 Pro had 500 (5× improvement)

---

## 11. Precision and Quantization

### 11.1 KV Cache Precision
- **Main KV:** FP4 (E2M1 format)
- **Scale:** E4M3 per 16 channels
- **Indexer K:** Shared across Reindex/Reuse layers (precision not disclosed)

### 11.2 Model Weights (Inference)
- **Expected:** FP4 + FP8 mixed precision (inherited from V4)
- **QAT:** Quantization-Aware Training during pre-training
- **Expert weights:** Likely FP4
- **Attention:** Likely FP8

---

## 12. Architecture Comparison: V4 Flash vs V4.1 Flash

| Component | V4 Flash | V4.1 Flash |
|-----------|----------|------------|
| **Architecture** | Decoder-only | Causal Encoder-Decoder (20+20 layers) |
| **Total params** | 284B | 552B |
| **Active params (prefill)** | 13B | 8B |
| **Active params (decode)** | 13B | 16B |
| **Attention** | CSA + HCA hybrid | CSA2 (Full/Reindex/Reuse) |
| **Residual** | Standard | Single-Pass mHC |
| **KV cache/token** | ~3,560 bytes | ~890 bytes (1/4×) |
| **Vision** | Separate model | Native built-in |
| **Engram** | No | 196B conditional memory |
| **Speculative decoding** | MTP | DSpark (MHC-aligned) |

---

## 13. Key Innovations Summary

1. **Causal Encoder-Decoder:** 20+20 layer split with projected global KV
2. **CSA2:** Three-mode sparse attention with cross-layer sharing
3. **FP4 KV Cache:** E2M1 format, 1/4 the footprint of V4 Flash
4. **Single-Pass mHC:** Manifold-constrained hyper-connections for residual stability
5. **Native Multimodal:** DeepSeek-ViT with 2D-RoPE, joint training from scratch
6. **Engram Memory:** 196B sparse conditional memory for factual knowledge
7. **DSpark:** MHC-aligned speculative decoding with gated residual reduction
8. **SWA Bounded Replay:** Reconstructs sliding-window attention from recent tokens only

---

## References
- DeepSeek V4.1 Flash HuggingFace Model Card: https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash
- DeepSeek Official Announcement: https://www.deepseek.com/en/news/deepseek-v4-1-flash/
- DeepSeek V4 Technical Report (arXiv 2606.19348): https://arxiv.org/abs/2606.19348
- CSA2 and mHC documentation (referenced in model card)

---

**Document Version:** 1.0  
**Last Updated:** September 11, 2026  
**Status:** Based on official HuggingFace model card and verified technical specifications
