#!/usr/bin/env python3
"""Same-candidate-set benchmark: reranker vs decision model.

Ranks ONE shared candidate window per query with both families and reports the
four things the substitution argument in blog/decision-models-vs-rerankers.html
actually turns on:

  ranking quality   Recall@k, nDCG@k, MRR for both families over identical inputs
  threshold ability ECE / Brier / a global cutoff vs per-query oracle cutoff,
                    plus abstention-band rate -- the axis only one family has
  agreement         top-k overlap between the two rankings (they can tie on
                    quality and still disagree on documents)
  latency           p50 / p95 wall-clock per query per family

Protocol
--------
1. Build the candidate window ONCE per query (local BM25 over a corpus you
   already have on disk, or a candidates file you supply). Both rankers then
   see byte-identical candidates in byte-identical order.
2. Reranker scores each (query, doc) pair independently -> one raw logit.
3. Decision model scores the same window with one Noul question per document,
   batched into shared requests -> one calibrated probability per document.
4. Query ids are split (seeded) into fit / eval halves; cutoffs and calibrators
   are fit on the fit half only and reported on the eval half.

Usage
-----
  python scripts/benchmark-substitution.py --self-test        # no models, no network
  python scripts/benchmark-substitution.py --plan             # show resolved config, exit
  python scripts/benchmark-substitution.py --beir-dir data/BeIR/nfcorpus
  python scripts/benchmark-substitution.py --candidates window.jsonl --corpus corpus.jsonl

Network: --self-test and --plan never touch the network. A real run loads model
weights; transformers/von fetch them on first use unless already cached, so run
it only when you have decided to. --self-test covers the metric core only --
the model adapters below are written to the documented card APIs
(BAAI/bge-reranker-v2-m3 via AutoModelForSequenceClassification, Von via
von.VonClient(local=True).system_one) but have not been exercised here.

Exit codes: 0 ok, 2 self-test failure, 1 runtime/config error.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import random
import sys
import time
from typing import Dict, List, Optional, Sequence, Tuple

# --------------------------------------------------------------------------
# Metric core (stdlib only -- this is what --self-test verifies)
# --------------------------------------------------------------------------


def sigmoid(x: float) -> float:
    if x >= 0:
        z = math.exp(-x)
        return 1.0 / (1.0 + z)
    z = math.exp(x)
    return z / (1.0 + z)


def dcg_at_k(gains: Sequence[float], k: int) -> float:
    return sum(g / math.log2(i + 2) for i, g in enumerate(list(gains)[:k]))


def ndcg_at_k(ranked_gains: Sequence[float], k: int) -> float:
    """nDCG@k with gains already graded (binary 0/1 or graded 0..4)."""
    ideal = sorted(ranked_gains, reverse=True)
    idcg = dcg_at_k(ideal, k)
    if idcg <= 0.0:
        return 0.0
    return dcg_at_k(ranked_gains, k) / idcg


def recall_at_k(ranked_ids: Sequence[str], relevant_ids: Sequence[str], k: int) -> float:
    rel = set(relevant_ids)
    if not rel:
        return 0.0
    top = set(list(ranked_ids)[:k])
    return len(top & rel) / len(rel)


def mrr_at_k(ranked_ids: Sequence[str], relevant_ids: Sequence[str], k: int) -> float:
    rel = set(relevant_ids)
    for i, d in enumerate(list(ranked_ids)[:k]):
        if d in rel:
            return 1.0 / (i + 1)
    return 0.0


def precision_at_k(ranked_ids: Sequence[str], relevant_ids: Sequence[str], k: int) -> float:
    if k <= 0:
        return 0.0
    rel = set(relevant_ids)
    top = list(ranked_ids)[:k]
    if not top:
        return 0.0
    return sum(1 for d in top if d in rel) / len(top)


def topk_overlap(a: Sequence[str], b: Sequence[str], k: int) -> float:
    """Share of documents shared by both top-k lists (Opine-style agreement %)."""
    if k <= 0:
        return 0.0
    sa, sb = set(list(a)[:k]), set(list(b)[:k])
    return len(sa & sb) / k


def brier(probs: Sequence[float], labels: Sequence[int]) -> float:
    if not probs:
        return float("nan")
    return sum((p - y) ** 2 for p, y in zip(probs, labels)) / len(probs)


def ece(probs: Sequence[float], labels: Sequence[int], bins: int = 10) -> float:
    """Expected calibration error, equal-width bins."""
    n = len(probs)
    if n == 0:
        return float("nan")
    idx = sorted(range(n), key=lambda i: probs[i])
    total = 0.0
    for b in range(bins):
        lo, hi = b / bins, (b + 1) / bins
        members = [i for i in idx if (lo <= probs[i] < hi) or (b == bins - 1 and probs[i] == 1.0)]
        if not members:
            continue
        conf = sum(probs[i] for i in members) / len(members)
        acc = sum(labels[i] for i in members) / len(members)
        total += (len(members) / n) * abs(acc - conf)
    return total


def fit_platt(scores: Sequence[float], labels: Sequence[int],
              steps: int = 300, lr: float = 0.5, ridge: float = 1e-2) -> Tuple[float, float]:
    """Platt scaling: sigmoid(a*s + b) fit by ridge-regularised gradient ascent.

    Pure-python, deterministic, handles separable inputs thanks to the ridge.
    Returns (a, b).
    """
    if len(scores) != len(labels) or not scores:
        raise ValueError("fit_platt needs equal, non-empty scores and labels")
    mean = sum(scores) / len(scores)
    var = sum((s - mean) ** 2 for s in scores) / len(scores) or 1.0
    sd = math.sqrt(var)
    xs = [(s - mean) / sd for s in scores]
    a, b = 0.0, 0.0
    n = len(xs)
    for _ in range(steps):
        ga = gb = 0.0
        for x, y in zip(xs, labels):
            # ascent on log-likelihood: dL/dz = (y - p)
            e = y - sigmoid(a * x + b)
            ga += e * x
            gb += e
        ga = ga / n - ridge * a
        gb = gb / n
        a += lr * ga
        b += lr * gb
    # return coefficients in the original score space
    a_scaled = a / sd
    b_scaled = b - mean * a_scaled
    return a_scaled, b_scaled


def apply_platt(scores: Sequence[float], coef: Tuple[float, float]) -> List[float]:
    a, b = coef
    return [sigmoid(a * s + b) for s in scores]


def percentile(values: Sequence[float], q: float) -> float:
    """Linear-interpolated percentile, q in [0, 100]."""
    if not values:
        return float("nan")
    xs = sorted(values)
    if len(xs) == 1:
        return xs[0]
    pos = (q / 100.0) * (len(xs) - 1)
    lo = int(math.floor(pos))
    hi = min(lo + 1, len(xs) - 1)
    frac = pos - lo
    return xs[lo] * (1 - frac) + xs[hi] * frac


def best_cutoff(scores: Sequence[float], labels: Sequence[int]) -> Tuple[float, float]:
    """Global threshold maximising Youden's J on a fit split.

    Returns (threshold, J). Thresholds are candidate score values (plus one
    step above the max so "everything passes" is representable).
    """
    pairs = sorted(zip(scores, labels))
    if not pairs or not any(labels) or all(labels):
        return float("-inf"), 0.0
    cand = [pairs[0][0] - 1e-9] + [s for s, _ in pairs]
    best_t, best_j = cand[0], -1.0
    n_pos = sum(labels) or 1
    n_neg = len(labels) - n_pos or 1
    for t in cand:
        tp = sum(1 for s, y in zip(scores, labels) if y == 1 and s >= t)
        fp = sum(1 for s, y in zip(scores, labels) if y == 0 and s >= t)
        tpr = tp / n_pos
        fpr = fp / n_neg
        j = tpr - fpr
        if j > best_j:
            best_t, best_j = t, j
    return best_t, best_j


def apply_cutoff(scores: Sequence[float], t: float) -> List[int]:
    return [1 if s >= t else 0 for s in scores]


def prf(preds: Sequence[int], labels: Sequence[int]) -> Dict[str, float]:
    tp = sum(1 for p, y in zip(preds, labels) if p == 1 and y == 1)
    fp = sum(1 for p, y in zip(preds, labels) if p == 1 and y == 0)
    fn = sum(1 for p, y in zip(preds, labels) if p == 0 and y == 1)
    prec = tp / (tp + fp) if (tp + fp) else 0.0
    rec = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0.0
    return {"precision": prec, "recall": rec, "f1": f1}


def band_rate(probs: Sequence[float], lo: float = 0.2, hi: float = 0.8) -> float:
    """Share of probabilities inside the abstention band (Von's 0.2-0.8 rule)."""
    if not probs:
        return 0.0
    return sum(1 for p in probs if lo <= p <= hi) / len(probs)


def rank_by(scores: Dict[str, float]) -> List[str]:
    """Descending by score; ties broken by doc id so the order is reproducible."""
    return [d for d, _ in sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))]


# --------------------------------------------------------------------------
# SELF TEST -- synthetic fixtures only, no models, no network, no data files
# --------------------------------------------------------------------------

def self_test() -> int:
    fails: List[str] = []

    def check(name: str, got, want, tol: float = 1e-9):
        ok = abs(got - want) <= tol if isinstance(want, float) else got == want
        if not ok:
            fails.append(f"{name}: got {got!r}, want {want!r}")

    # ndcg: binary gains [1,0,1,1] -> DCG = 1 + 0 + 0.5 + 1/log2(5)
    # IDCG = 1 + 1/log2(3) + 0.5 = 2.1309297535714573, ratio below
    check("ndcg", ndcg_at_k([1, 0, 1, 1], 4), 0.9060254355346823, tol=1e-12)
    check("ndcg_ideal_is_one", ndcg_at_k([3, 2, 1, 0], 4), 1.0, tol=1e-12)
    check("ndcg_all_zero", ndcg_at_k([0, 0, 0], 3), 0.0)
    # graded gains still normalise
    check("ndcg_graded_range", 0.0 < ndcg_at_k([4, 0, 2, 1], 4) < 1.0, True)

    rel = ["d1", "d2", "d3"]
    check("recall", recall_at_k(["d1", "x", "d3", "y", "z"], rel, 5), 2 / 3, tol=1e-12)
    check("recall_no_relevant_is_zero", recall_at_k(["d1"], [], 5), 0.0)
    check("mrr", mrr_at_k(["x", "y", "d2"], rel, 5), 1 / 3, tol=1e-12)
    check("precision", precision_at_k(["d1", "x", "d3"], rel, 3), 2 / 3, tol=1e-12)
    check("overlap_identical", topk_overlap(["a", "b", "c"], ["c", "b", "a"], 3), 1.0, tol=1e-12)
    check("overlap_disjoint", topk_overlap(["a", "b"], ["c", "d"], 2), 0.0)

    check("brier_perfect", brier([1.0, 0.0], [1, 0]), 0.0)
    check("brier_worst", brier([0.0, 1.0], [1, 0]), 1.0)
    # perfectly calibrated within each equal-width bin:
    # bin [0.9,1.0): 81/90 positives (acc 0.9 = conf); bin [0.1,0.2): 1/10
    probs = [0.9] * 90 + [0.1] * 10
    labs = [1] * 81 + [0] * 9 + [1] + [0] * 9
    check("ece_perfectly_calibrated", ece(probs, labs), 0.0, tol=1e-12)
    # confident and wrong everywhere
    check("ece_confident_wrong", ece([0.95] * 100, [0] * 100), 0.95, tol=1e-12)

    # platt: well-separated synthetic scores -> fit then held-out accuracy > 0.95
    # (means +-2.5, sd 0.8 => Bayes accuracy ~0.99, so 0.95 is achievable)
    rnd = random.Random(7)
    tr_s = [rnd.gauss(2.5, 0.8) for _ in range(200)] + [rnd.gauss(-2.5, 0.8) for _ in range(200)]
    tr_y = [1] * 200 + [0] * 200
    coef = fit_platt(tr_s, tr_y)
    te_s = [rnd.gauss(2.5, 0.8) for _ in range(200)] + [rnd.gauss(-2.5, 0.8) for _ in range(200)]
    te_y = [1] * 200 + [0] * 200
    preds = apply_cutoff(apply_platt(te_s, coef), 0.5)
    acc = sum(int(p == y) for p, y in zip(preds, te_y)) / len(te_y)
    check("platt_held_out_accuracy", acc > 0.95, True)
    # a constant score must not blow up
    cf = fit_platt([0.5] * 50, [1] * 25 + [0] * 25)
    check("platt_constant_finite", all(math.isfinite(c) for c in cf), True)

    check("percentile_p50", percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 50), 5.5, tol=1e-12)
    check("percentile_p0_p100", (percentile([3, 1, 2], 0), percentile([3, 1, 2], 100)), (1, 3))

    t, j = best_cutoff([0.9, 0.8, 0.2, 0.1], [1, 1, 0, 0])
    check("best_cutoff_separates", apply_cutoff([0.9, 0.8, 0.2, 0.1], t), [1, 1, 0, 0])
    check("best_cutoff_j", j > 0.99, True)
    p = prf([1, 1, 0, 0], [1, 0, 1, 0])
    check("prf", (round(p["precision"], 6), round(p["recall"], 6)), (0.5, 0.5))

    check("band_rate", band_rate([0.1, 0.5, 0.95, 0.79]), 0.5, tol=1e-12)

    # ranking direction: a ranker that scores relevant docs higher must beat
    # one that scores them lower -- catches an accidental ascending sort.
    ids = [f"d{i}" for i in range(50)]
    rel_ids = ["d3", "d17", "d41"]
    good = {d: (1.0 if d in rel_ids else rnd.random() * 0.5) for d in ids}
    bad = {d: (0.0 if d in rel_ids else 0.5 + rnd.random() * 0.5) for d in ids}
    g, b = rank_by(good), rank_by(bad)
    check("ranking_direction", ndcg_at_k([1 if d in rel_ids else 0 for d in g], 10)
          > ndcg_at_k([1 if d in rel_ids else 0 for d in b], 10), True)
    check("rank_by_tiebreak", rank_by({"b": 1.0, "a": 1.0, "c": 2.0}), ["c", "a", "b"])

    # ---- full pipeline with fake adapters: exercises evaluate(), the fit/eval
    # split, the threshold blocks and the markdown renderer, still offline ----
    docs = {f"d{i}": f"filler document body number {i}" for i in range(40)}
    queries = {f"q{j}": f"query number {j}" for j in range(24)}
    qrels, windows, gold_map = {}, {}, {}
    for j in range(24):
        qid = f"q{j}"
        win = [f"d{i}" for i in range(30)]
        windows[qid] = win
        rel = rnd.sample(win, 5)
        qrels[qid] = {d: 2 for d in rel}
        gold_map[qid] = set(rel)

    class FakeAdapter:
        def __init__(self, model_id, quality):
            self.model_id, self.quality = model_id, quality

        def scores(self, query, doc_ids, _docs):
            j = int(query.rsplit(" ", 1)[1])
            rel = gold_map[f"q{j}"]
            out = {}
            for d in doc_ids:
                base = 1.0 if d in rel else 0.0
                out[d] = base * self.quality + (1 - self.quality) * rnd.random()
            return out

    ns = argparse.Namespace(window=30, ks=[1, 5, 10], k=10, min_rel=1.0,
                            split=0.5, seed=17, limit=0)
    try:
        rep = evaluate(docs, queries, qrels, windows,
                       FakeAdapter("fake-reranker", 0.92),
                       FakeAdapter("fake-decision", 0.88), ns)
        check("pipeline_query_count", rep["config"]["queries"], 24)
        nd10 = rep["ranking"][10]["ndcg@k"]["reranker"]
        check("pipeline_ndcg_in_range", 0.0 <= nd10 <= 1.0, True)
        check("pipeline_ranker_beats_chance", nd10 > 0.5, True)
        check("pipeline_split_nonempty",
              (rep["config"]["fit_queries"] > 0 and rep["config"]["eval_queries"] > 0), True)
        check("pipeline_overlap_in_range",
              0.0 <= rep["ranking"][10]["topk_overlap"] <= 1.0, True)
        check("pipeline_threshold_keys",
              all(k in rep["threshold"]["reranker"] for k in
                  ("raw_ece", "global_f1", "per_query_oracle_f1", "band_rate")), True)
        check("pipeline_oracle_ge_global",
              rep["threshold"]["reranker"]["per_query_oracle_f1"] + 1e-9
              >= min(rep["threshold"]["reranker"]["global_f1"], 1.0), True)
        check("pipeline_latency_nonneg",
              rep["latency_s"]["reranker_p50"] >= 0.0
              and rep["latency_s"]["decision_p95"] >= 0.0, True)
        md = render_markdown(rep)
        check("pipeline_markdown",
              ("| recall@k (k=10) |" in md and "| latency p50 (s) |" in md), True)
    except Exception as exc:  # any crash here is a core failure
        fails.append(f"pipeline: {type(exc).__name__}: {exc}")

    if fails:
        print("SELF-TEST FAIL")
        for f in fails:
            print("  -", f)
        return 2
    print("SELF-TEST PASS (metric core: ndcg/recall/mrr/precision/overlap/"
          "brier/ece/platt/cutoff/prf/band/percentile/rank_by; "
          "plus synthetic end-to-end pipeline)")
    return 0


# --------------------------------------------------------------------------
# Data: candidate windows built locally (no network)
# --------------------------------------------------------------------------


def _read_jsonl(path: str) -> List[dict]:
    rows: List[dict] = []
    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def _read_table(path: str) -> List[dict]:
    """Read JSONL or parquet (BeIR ships parquet; pyarrow is optional)."""
    if path.endswith(".jsonl") or path.endswith(".json"):
        return _read_jsonl(path)
    if path.endswith(".parquet"):
        try:
            import pyarrow.parquet as pq  # type: ignore
        except ImportError as exc:
            raise SystemExit(
                f"{path} is parquet and pyarrow is not installed "
                "(pip install pyarrow), or export it to jsonl first"
            ) from exc
        return pq.read_table(path).to_pylist()
    raise SystemExit(f"unsupported table format: {path}")


def _first(row: dict, *names: str):
    for n in names:
        if n in row and row[n] is not None:
            return row[n]
    return None


def load_beir(beir_dir: str) -> Tuple[dict, dict, dict]:
    """Load a local BeIR subset (corpus/, queries/, qrels/ parquet dirs).

    Nothing is downloaded: you point --beir-dir at a directory you already have.
    Returns (docs {id:text}, queries {id:text}, qrels {qid:{doc:grade}}).
    """
    import glob as _glob

    def pick(sub: str) -> str:
        hits = sorted(_glob.glob(os.path.join(beir_dir, sub, "*.parquet")))
        if not hits:
            raise SystemExit(f"no parquet under {os.path.join(beir_dir, sub)}")
        return hits[0]

    docs = {}
    for r in _read_table(pick("corpus")):
        did = _first(r, "_id", "id", "doc_id", "corpus-id")
        txt = _first(r, "text", "content", "passage")
        if did is not None and txt:
            docs[str(did)] = str(txt)
    queries = {}
    for r in _read_table(pick("queries")):
        qid = _first(r, "_id", "id", "query_id", "query-id")
        txt = _first(r, "text", "query")
        if qid is not None and txt:
            queries[str(qid)] = str(txt)
    qrels: dict = {}
    qf = sorted(_glob.glob(os.path.join(beir_dir, "qrels", "*")))
    if not qf:
        raise SystemExit(f"no qrels under {os.path.join(beir_dir, 'qrels')}")
    for r in _read_table(qf[0]):
        qid = str(_first(r, "query-id", "query_id", "qid"))
        did = str(_first(r, "corpus-id", "corpus_id", "doc_id", "docid"))
        rel = float(_first(r, "score", "relevance", "rel") or 0)
        qrels.setdefault(qid, {})[did] = rel
    return docs, queries, qrels


def load_candidates(path: str) -> Dict[str, List[str]]:
    """Precomputed windows: JSONL {query_id, candidates:[...]} (order preserved),
    or a flat dict {qid: [doc ids]} in one JSON file."""
    if path.endswith(".jsonl"):
        out = {}
        for r in _read_jsonl(path):
            out[str(_first(r, "query_id", "qid"))] = [str(d) for d in r["candidates"]]
        return out
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    return {str(k): [str(d) for d in v] for k, v in data.items()}


class BM25:
    """Tiny BM25 (k1=1.5, b=0.75) over an in-memory corpus.

    The recall stage must not depend on a service or a download, so the default
    window builder is this. Swap it out with --candidates for your own retriever.
    """

    def __init__(self, docs: Dict[str, str], k1: float = 1.5, b: float = 0.75):
        self.k1, self.b = k1, b
        self.ids = list(docs)
        self.toks: Dict[str, List[str]] = {}
        self.len: Dict[str, int] = {}
        df: Dict[str, int] = {}
        for did, text in docs.items():
            toks = _tokenize(text)
            self.toks[did] = toks
            self.len[did] = len(toks)
            for t in set(toks):
                df[t] = df.get(t, 0) + 1
        n = len(self.ids) or 1
        self.avgdl = (sum(self.len.values()) / n) or 1.0
        self.idf = {
            t: math.log((n - c + 0.5) / (c + 0.5) + 1.0) for t, c in df.items()
        }
        self.inv: Dict[str, List[str]] = {}
        for did, toks in self.toks.items():
            for t in set(toks):
                self.inv.setdefault(t, []).append(did)

    def top(self, query: str, k: int) -> List[str]:
        scores: Dict[str, float] = {}
        for t in _tokenize(query):
            idf = self.idf.get(t)
            if idf is None:
                continue
            for did in self.inv.get(t, ()):
                tf = self.toks[did].count(t)
                dl = self.len[did] or 1
                denom = tf + self.k1 * (1 - self.b + self.b * dl / self.avgdl)
                scores[did] = scores.get(did, 0.0) + idf * tf * (self.k1 + 1) / denom
        if not scores:
            # vocabulary miss: fall back to nothing rather than random docs
            return []
        ranked = sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))
        return [d for d, _ in ranked[:k]]


def _tokenize(text: str) -> List[str]:
    out: List[str] = []
    cur: List[str] = []
    for ch in text.lower():
        if ch.isalnum() and not ch.isspace():
            cur.append(ch)
        elif cur:
            out.append("".join(cur))
            cur = []
    if cur:
        out.append("".join(cur))
    return out


# --------------------------------------------------------------------------
# Adapters: one per family. Heavy imports happen inside -- lazily, so the
# script stays importable (and self-testable) without torch or weights.
# --------------------------------------------------------------------------


class RerankerAdapter:
    """Cross-encoder: one (query, doc) forward pass -> one raw logit.

    Default model BAAI/bge-reranker-v2-m3 (XLMRobertaForSequenceClassification).
    Scores are RAW logits, exactly as the cards deliver them -- the threshold
    analysis downstream is what tells you whether they mean anything.
    """

    name = "reranker"

    def __init__(self, model_id: str, max_length: int = 512, batch_size: int = 32):
        try:
            import torch
            from transformers import AutoModelForSequenceClassification, AutoTokenizer
        except ImportError as exc:
            raise SystemExit(
                "reranker adapter needs torch + transformers (pip install torch transformers)"
            ) from exc
        self._torch = torch
        self.tok = AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)
        self.model = AutoModelForSequenceClassification.from_pretrained(
            model_id, trust_remote_code=True
        )
        self.model.eval()
        self.max_length = max_length
        self.batch_size = batch_size
        self.model_id = model_id

    def scores(self, query: str, doc_ids: Sequence[str], docs: Dict[str, str]) -> Dict[str, float]:
        torch = self._torch
        out: Dict[str, float] = {}
        ids = list(doc_ids)
        with torch.no_grad():
            for i in range(0, len(ids), self.batch_size):
                chunk = ids[i:i + self.batch_size]
                enc = self.tok(
                    [query] * len(chunk),
                    [docs[d] for d in chunk],
                    padding=True,
                    truncation=True,
                    max_length=self.max_length,
                    return_tensors="pt",
                )
                logits = self.model(**enc).logits
                if logits.shape[-1] == 1:
                    vals = logits.squeeze(-1)
                else:  # two-label heads: relevance logit difference, Qwen3-style
                    vals = logits[:, -1] - logits[:, 0]
                for d, v in zip(chunk, vals.tolist()):
                    out[d] = float(v)
        return out


class DecisionAdapter:
    """Decision model as reranker: one Noul question per candidate, batched.

    Uses the installed von-sdk (>= 1.3.7) against local weights via
    VonClient(local=True).system_one(state, questions). Ranking score is
    `noul_raw` -- the calibrated posterior -- falling back to `noul` (the
    committed, band-mapped value) when a backend does not return it.

    State layout mirrors Opine's published request: shared `query` + `documents`,
    one isolated question per document so candidates are judged independently.
    """

    name = "decision"

    def __init__(self, model_id: str = "von-latest", batch_size: int = 20):
        try:
            from von import Noul, VonClient
        except ImportError as exc:
            raise SystemExit(
                "decision adapter needs von-sdk (pip install 'von-sdk>=1.3.7')"
            ) from exc
        self.Noul = Noul
        self.client = VonClient(local=True)
        self.model_id = model_id
        self.batch_size = batch_size

    def scores(self, query: str, doc_ids: Sequence[str], docs: Dict[str, str]) -> Dict[str, float]:
        out: Dict[str, float] = {}
        ids = list(doc_ids)
        for i in range(0, len(ids), self.batch_size):
            chunk = ids[i:i + self.batch_size]
            state = {"query": query, "documents": {d: docs[d] for d in chunk}}
            questions = {
                d: self.Noul(
                    instructions=(
                        f"Does `documents.{d}` help answer `query`? "
                        "Prefer passages with the specific facts needed."
                    ),
                    criteria={
                        "true": "Contains specific information that answers, or is "
                                "necessary for answering, the query",
                        "false": "Unrelated, only tangentially related, or lacks "
                                 "the needed facts",
                    },
                )
                for d in chunk
            }
            resp = self.client.system_one(state, questions, model=self.model_id)
            for d in chunk:
                ans = resp.answers[d]
                raw = getattr(ans, "noul_raw", None)
                out[d] = float(raw if raw is not None else ans.noul)
        return out


class LayaAdapter:
    """Optional second decision model (pip install laya) -- kept separate so
    the default run does not require it."""

    name = "decision"

    def __init__(self, model_id: str, batch_size: int = 20):
        try:
            import laya  # type: ignore
        except ImportError as exc:
            raise SystemExit("laya adapter needs the laya package (pip install laya)") from exc
        self.m = laya.load(model_id)
        self.model_id = model_id
        self.batch_size = batch_size

    def scores(self, query: str, doc_ids: Sequence[str], docs: Dict[str, str]) -> Dict[str, float]:
        out: Dict[str, float] = {}
        ids = list(doc_ids)
        for i in range(0, len(ids), self.batch_size):
            chunk = ids[i:i + self.batch_size]
            state = {"query": query, "documents": {d: docs[d] for d in chunk}}
            questions = {
                d: {
                    "type": "noul",
                    "instructions": f"Does documents.{d} help answer query?",
                    "criteria": {
                        "true": "Contains the specific facts needed",
                        "false": "Unrelated or tangentially related",
                    },
                }
                for d in chunk
            }
            answers = self.m.predict(state, questions)
            for d in chunk:
                a = answers[d]
                raw = a.get("noul_raw") if isinstance(a, dict) else getattr(a, "noul_raw", None)
                val = a.get("noul") if isinstance(a, dict) else getattr(a, "noul")
                out[d] = float(raw if raw is not None else val)
        return out


# --------------------------------------------------------------------------
# Evaluation: same window in, both families, split fit/eval
# --------------------------------------------------------------------------


def labels_for(doc_ids: Sequence[str], qrel: Dict[str, float], min_rel: float) -> List[int]:
    return [1 if qrel.get(d, 0) >= min_rel else 0 for d in doc_ids]


def evaluate(docs, queries, qrels, windows, reranker, decision, args) -> dict:
    ks = [k for k in args.ks if k <= args.window]
    if args.k not in ks:
        ks.append(args.k)
        ks.sort()

    per_query = []
    total = len(windows)
    for n, (qid, win) in enumerate(windows.items(), 1):
        if qid not in queries or qid not in qrels:
            continue
        if args.limit and n > args.limit:
            break
        qrel = qrels[qid]
        known = [d for d in win if d in docs]
        if not known:
            continue
        gold = {d for d, g in qrel.items() if g >= args.min_rel}
        if not gold:
            continue

        t0 = time.perf_counter()
        rs = reranker.scores(queries[qid], known, docs)
        t_r = time.perf_counter() - t0
        t0 = time.perf_counter()
        ds = decision.scores(queries[qid], known, docs)
        t_d = time.perf_counter() - t0

        r_rank = rank_by(rs)
        d_rank = rank_by(ds)
        labs_r = labels_for(r_rank, qrel, args.min_rel)
        labs_d = labels_for(d_rank, qrel, args.min_rel)
        gains_r = [float(y) for y in labs_r]
        gains_d = [float(y) for y in labs_d]

        row = {
            "qid": qid,
            "n_cand": len(known),
            "n_rel": len(gold & set(known)),
            "latency_r": t_r,
            "latency_d": t_d,
            "rank_r": r_rank,
            "rank_d": d_rank,
            "scores_r": rs,
            "scores_d": ds,
            "labels_r": labs_r,
            "labels_d": labs_d,
            "recall_r": {k: recall_at_k(r_rank, list(gold), k) for k in ks},
            "recall_d": {k: recall_at_k(d_rank, list(gold), k) for k in ks},
            "ndcg_r": {k: ndcg_at_k(gains_r, k) for k in ks},
            "ndcg_d": {k: ndcg_at_k(gains_d, k) for k in ks},
            "mrr_r": {k: mrr_at_k(r_rank, list(gold), k) for k in ks},
            "mrr_d": {k: mrr_at_k(d_rank, list(gold), k) for k in ks},
            "overlap": {k: topk_overlap(r_rank, d_rank, k) for k in ks},
        }
        per_query.append(row)
        if n % 25 == 0:
            print(f"  ... {n}/{total} queries", file=sys.stderr)

    if not per_query:
        raise SystemExit("no usable queries (check qrels / windows / --min-rel)")

    # seeded fit/eval split over queries -- cutoffs are only ever fit on `fit`
    rnd = random.Random(args.seed)
    order = list(range(len(per_query)))
    rnd.shuffle(order)
    cut = int(len(order) * args.split)
    fit_idx, eval_idx = set(order[:cut]), set(order[cut:])
    if not fit_idx or not eval_idx:
        fit_idx, eval_idx = set(order), set(order)

    def pooled(idxs, key_scores, key_labels):
        s: List[float] = []
        y: List[int] = []
        for i in idxs:
            row = per_query[i]
            for d in row["rank_r"] if key_scores == "r" else row["rank_d"]:
                s.append(row[f"scores_{key_scores}"][d])
                y.append(row[key_labels][row["rank_" + key_scores].index(d)])
        return s, y

    def threshold_block(tag: str, idxs_fit, idxs_eval) -> dict:
        s_fit, y_fit = pooled(idxs_fit, tag, f"labels_{tag}")
        s_eval, y_eval = pooled(idxs_eval, tag, f"labels_{tag}")
        if not any(y_fit) or not any(y_eval):
            return {"skipped": "no positives in split"}
        t, _j = best_cutoff(s_fit, y_fit)
        raw_probs = [sigmoid(v) for v in s_eval]
        coef = fit_platt(s_fit, y_fit)
        cal_probs = apply_platt(s_eval, coef)
        # per-query oracle cutoff on eval: what you could reach if a cutoff
        # were allowed to move per query (i.e. if scores were comparable)
        oracle_f1 = []
        for i in idxs_eval:
            row = per_query[i]
            ss = [row[f"scores_{tag}"][d] for d in row[f"rank_{tag}"]]
            yy = row[f"labels_{tag}"]
            if not any(yy) or all(yy):
                continue
            ot, _ = best_cutoff(ss, yy)
            oracle_f1.append(prf(apply_cutoff(ss, ot), yy)["f1"])
        global_f1 = prf(apply_cutoff(s_eval, t), y_eval)["f1"]
        return {
            "raw_ece": ece(raw_probs, y_eval),
            "raw_brier": brier(raw_probs, y_eval),
            "calibrated_ece": ece(cal_probs, y_eval),
            "global_cutoff": t,
            "global_f1": global_f1,
            "per_query_oracle_f1": (sum(oracle_f1) / len(oracle_f1)) if oracle_f1 else float("nan"),
            "eval_f1": prf(apply_cutoff(s_eval, t), y_eval),
            "band_rate": band_rate(raw_probs),
        }

    thr_r = threshold_block("r", fit_idx, eval_idx)
    thr_d = threshold_block("d", fit_idx, eval_idx)

    def mean(path) -> float:
        vals = []
        for row in per_query:
            v = row
            for p in path:
                v = v[p]
            vals.append(v)
        return sum(vals) / len(vals)

    summary = {
        "config": {
            "reranker": reranker.model_id,
            "decision": decision.model_id,
            "window": args.window,
            "k_values": ks,
            "min_rel": args.min_rel,
            "queries": len(per_query),
            "fit_queries": len(fit_idx),
            "eval_queries": len(eval_idx),
            "seed": args.seed,
        },
        "ranking": {
            k: {
                "recall@k": {"reranker": mean(["recall_r", k]), "decision": mean(["recall_d", k])},
                "ndcg@k": {"reranker": mean(["ndcg_r", k]), "decision": mean(["ndcg_d", k])},
                "mrr@k": {"reranker": mean(["mrr_r", k]), "decision": mean(["mrr_d", k])},
                "topk_overlap": mean(["overlap", k]),
            }
            for k in ks
        },
        "threshold": {"reranker": thr_r, "decision": thr_d},
        "latency_s": {
            "reranker_p50": percentile([r["latency_r"] for r in per_query], 50),
            "reranker_p95": percentile([r["latency_r"] for r in per_query], 95),
            "decision_p50": percentile([r["latency_d"] for r in per_query], 50),
            "decision_p95": percentile([r["latency_d"] for r in per_query], 95),
        },
        "per_query": [
            {"qid": r["qid"], "n_cand": r["n_cand"], "n_rel": r["n_rel"]}
            for r in per_query
        ],
    }
    return summary


def render_markdown(rep: dict) -> str:
    c = rep["config"]
    out = [
        "# Reranker vs decision model — shared candidate set",
        "",
        f"reranker: `{c['reranker']}` · decision: `{c['decision']}` · "
        f"window {c['window']} · {c['queries']} queries "
        f"(fit {c['fit_queries']} / eval {c['eval_queries']}) · seed {c['seed']}",
        "",
        "| Metric | Reranker | Decision model |",
        "|---|---:|---:|",
    ]
    for k, block in rep["ranking"].items():
        for m in ("recall@k", "ndcg@k", "mrr@k"):
            v = block[m]
            out.append(f"| {m} (k={k}) | {v['reranker']:.4f} | {v['decision']:.4f} |")
    out.append(f"| top-{rep['config']['k_values'][-1]} overlap (agreement) | "
               f"{rep['ranking'][rep['config']['k_values'][-1]]['topk_overlap']:.4f} | — |")
    tr, td = rep["threshold"]["reranker"], rep["threshold"]["decision"]
    if "skipped" not in tr and "skipped" not in td:
        out += [
            f"| ECE of raw score (no fit) | {tr['raw_ece']:.4f} | {td['raw_ece']:.4f} |",
            f"| Brier (no fit) | {tr['raw_brier']:.4f} | {td['raw_brier']:.4f} |",
            f"| ECE after calibrator fit on fit-split | {tr['calibrated_ece']:.4f} | {td['calibrated_ece']:.4f} |",
            f"| F1 of one global cutoff | {tr['global_f1']:.4f} | {td['global_f1']:.4f} |",
            f"| F1 with a cutoff allowed per query | {tr['per_query_oracle_f1']:.4f} | {td['per_query_oracle_f1']:.4f} |",
            f"| share inside abstention band 0.2–0.8 | {tr['band_rate']:.4f} | {td['band_rate']:.4f} |",
        ]
    l = rep["latency_s"]
    out += [
        f"| latency p50 (s) | {l['reranker_p50']:.4f} | {l['decision_p50']:.4f} |",
        f"| latency p95 (s) | {l['reranker_p95']:.4f} | {l['decision_p95']:.4f} |",
        "",
    ]
    return "\n".join(out)


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Rank one shared candidate window with a reranker and a "
                    "decision model; report ranking, threshold-ability, "
                    "agreement and latency.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("--self-test", action="store_true",
                   help="run the metric-core self-test (no models, no network) and exit")
    p.add_argument("--plan", action="store_true",
                   help="print the resolved run configuration and exit without loading models")
    src = p.add_argument_group("candidate window (pick one source)")
    src.add_argument("--beir-dir", help="local BeIR subset dir with corpus/ queries/ qrels/ parquet")
    src.add_argument("--candidates", help="precomputed windows: jsonl {query_id, candidates[]} or a json dict")
    src.add_argument("--corpus", help="corpus jsonl (doc_id/text) when no --beir-dir")
    src.add_argument("--queries", help="queries jsonl (query_id/text) when no --beir-dir")
    src.add_argument("--qrels", help="qrels: jsonl {query_id, doc_id, relevance} or TREC 'qid 0 doc rel'")
    src.add_argument("--window", type=int, default=60, help="candidates per query")
    mdl = p.add_argument_group("models")
    mdl.add_argument("--reranker-model", default="BAAI/bge-reranker-v2-m3",
                     help="HF id for the cross-encoder")
    mdl.add_argument("--decision-model", default="von",
                     help="'von' (von-sdk local) or 'laya:<hf-id>'")
    mdl.add_argument("--reranker-batch", type=int, default=32)
    mdl.add_argument("--noul-batch", type=int, default=20,
                     help="Noul questions per shared decision-model request")
    ev = p.add_argument_group("evaluation")
    ev.add_argument("--k", type=int, default=10, help="primary cut for the report table")
    ev.add_argument("--ks", type=int, nargs="+", default=[1, 5, 10, 20],
                    help="extra cuts to report")
    ev.add_argument("--min-rel", type=float, default=1.0, help="qrels grade counted as relevant")
    ev.add_argument("--split", type=float, default=0.5, help="share of queries used to fit cutoffs")
    ev.add_argument("--seed", type=int, default=17)
    ev.add_argument("--limit", type=int, default=0, help="max queries (0 = all)")
    ev.add_argument("--out", help="write the full JSON report here")
    return p


def load_inputs(args) -> Tuple[dict, dict, dict, Dict[str, List[str]]]:
    if args.beir_dir:
        docs, queries, qrels = load_beir(args.beir_dir)
    elif args.corpus and args.queries and args.qrels:
        docs = {str(_first(r, "doc_id", "_id", "id")): str(_first(r, "text", "content"))
                for r in _read_table(args.corpus)}
        queries = {str(_first(r, "query_id", "_id", "id")): str(_first(r, "text", "query"))
                   for r in _read_table(args.queries)}
        qrels = {}
        if args.qrels.endswith(".jsonl") or args.qrels.endswith(".json"):
            for r in _read_table(args.qrels):
                qrels.setdefault(str(_first(r, "query_id", "qid")), {})[
                    str(_first(r, "doc_id", "docid"))] = float(
                        _first(r, "relevance", "rel", "score") or 0)
        else:  # TREC: qid whitespace docid whitespace rel
            with open(args.qrels, "r", encoding="utf-8") as fh:
                for line in fh:
                    parts = line.split()
                    if len(parts) >= 4:
                        qrels.setdefault(parts[0], {})[parts[2]] = float(parts[3])
    else:
        raise SystemExit("need --beir-dir, or --corpus + --queries + --qrels")

    if args.candidates:
        windows = load_candidates(args.candidates)
    else:
        print(f"building {args.window}-candidate windows with local BM25 "
              f"over {len(docs)} docs (no network)...", file=sys.stderr)
        index = BM25(docs)
        windows = {}
        for qid, qtext in queries.items():
            hit = index.top(qtext, args.window)
            if hit:
                windows[qid] = hit
    usable = {q: w for q, w in windows.items() if q in qrels and q in queries}
    if not usable:
        raise SystemExit("no overlap between qrels and candidate windows")
    print(f"{len(usable)} queries with qrels and a non-empty window",
          file=sys.stderr)
    return docs, queries, qrels, usable


def make_adapter(kind: str, args):
    if kind == "von":
        return DecisionAdapter(model_id="von-latest", batch_size=args.noul_batch)
    if kind.startswith("laya:"):
        return LayaAdapter(model_id=kind.split(":", 1)[1], batch_size=args.noul_batch)
    raise SystemExit(f"unknown --decision-model {kind!r} (use 'von' or 'laya:<id>')")


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = build_parser().parse_args(argv)
    if args.self_test:
        return self_test()
    if args.plan:
        print(json.dumps({
            "reranker": args.reranker_model,
            "decision": args.decision_model,
            "window": args.window,
            "ks": sorted(set(args.ks + [args.k])),
            "source": args.beir_dir or args.candidates or
                      (args.corpus and "corpus/queries/qrels"),
            "min_rel": args.min_rel, "split": args.split, "seed": args.seed,
            "network": "model weights only, on first use unless cached",
        }, indent=2))
        return 0

    docs, queries, qrels, windows = load_inputs(args)
    reranker = RerankerAdapter(args.reranker_model,
                               batch_size=args.reranker_batch)
    decision = make_adapter(args.decision_model, args)
    print("scoring the shared candidate set...", file=sys.stderr)
    report = evaluate(docs, queries, qrels, windows, reranker, decision, args)
    md = render_markdown(report)
    print(md)
    if args.out:
        os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
        with open(args.out, "w", encoding="utf-8") as fh:
            json.dump(report, fh, indent=2, ensure_ascii=False)
        print(f"full report written to {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)
