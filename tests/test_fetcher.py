#!/usr/bin/env python3
"""
Unit tests for scripts/daily_gguf_fetcher.py.

Guards the production-bug fixes from 2026-08-04:
  1. _merge_key — legacy entries without modelId/filename must NOT all
     collapse to the same key (the 16,519 → 1,751 catalog wipe).
  2. _estimate_file_size regex — timestamps like "1781204855.BF16" must not
     be parsed as "1781204855 billion parameters" (the 3652861.5 TB entry).
  3. _save_output — implausible sizes are clamped and modelId/filename are
     backfilled from the download link.

Run:  python -m unittest discover -s tests -p 'test_*.py' -v
"""
import json
import logging
import sys
import tempfile
import unittest
from pathlib import Path

# Make scripts/ importable (the fetcher imports spam_filter from repo root)
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'scripts'))

from scripts.daily_gguf_fetcher import (  # noqa: E402
    DailyGGUFFetcher,
    _parse_download_link,
)


def _make_fetcher(tmp_path: Path, incremental: bool = True) -> DailyGGUFFetcher:
    """Build a fetcher without touching the network (bypass __init__)."""
    fetcher = object.__new__(DailyGGUFFetcher)
    fetcher.output_file = Path(tmp_path) / 'out.json'
    fetcher.incremental = incremental
    fetcher.logger = logging.getLogger('test-fetcher')
    fetcher.logger.disabled = True  # silence progress bars / logs (per-fetcher, not global)
    fetcher.MAX_SANE_FILE_SIZE = 2 * 1024 ** 4  # 2 TiB, same as class
    fetcher.MAX_FILES_PER_MODEL = 30
    return fetcher


class TestParseDownloadLink(unittest.TestCase):
    def test_standard_link(self):
        parsed = _parse_download_link(
            'https://huggingface.co/org/model/resolve/main/file-Q4_K_M.gguf'
        )
        self.assertEqual(parsed, ('org/model', 'file-Q4_K_M.gguf'))

    def test_link_with_nested_path(self):
        parsed = _parse_download_link(
            'https://huggingface.co/org/model/resolve/main/subdir/file.gguf'
        )
        self.assertEqual(parsed, ('org/model', 'subdir/file.gguf'))

    def test_non_download_link(self):
        self.assertIsNone(_parse_download_link('https://huggingface.co/org/model'))
        self.assertIsNone(_parse_download_link(''))
        self.assertIsNone(_parse_download_link(None))


class TestMergeKey(unittest.TestCase):
    def setUp(self):
        self.fetcher = _make_fetcher(Path(tempfile.mkdtemp()))

    def test_new_entries_key_on_primary_fields(self):
        key = self.fetcher._merge_key({
            'modelId': 'org/model',
            'filename': 'model.gguf',
        })
        self.assertEqual(key, 'org/model::model.gguf')

    def test_legacy_entries_fall_back_to_link(self):
        # Entries from before modelId/filename existed: must parse from URL
        key = self.fetcher._merge_key({
            'directDownloadLink':
                'https://huggingface.co/org/model/resolve/main/model.gguf',
        })
        self.assertEqual(key, 'org/model::model.gguf')

    def test_distinct_legacy_entries_never_collapse(self):
        # The regression: without the link fallback every legacy entry became
        # "::" and the incremental merge wiped the catalog.
        a = self.fetcher._merge_key({
            'directDownloadLink':
                'https://huggingface.co/a/x/resolve/main/x.gguf',
        })
        b = self.fetcher._merge_key({
            'directDownloadLink':
                'https://huggingface.co/b/y/resolve/main/y.gguf',
        })
        self.assertNotEqual(a, b)
        self.assertNotEqual(a, '::')
        self.assertNotEqual(b, '::')

    def test_unparseable_link_still_unique(self):
        key = self.fetcher._merge_key({'directDownloadLink': 'https://x/y'})
        self.assertTrue(key.startswith('link::'))
        other = self.fetcher._merge_key({'directDownloadLink': 'https://z/w'})
        self.assertNotEqual(key, other)

    def test_shard_parts_share_one_merge_key(self):
        # Regression: an aggregated entry keeps part 1's filename
        # (model-00001-of-00004.gguf) while legacy snapshots stored OTHER parts
        # (model-00002-of-00004.gguf etc). All parts must map to the same merge
        # key so the aggregated entry REPLACES every stale per-part entry.
        keys = {
            self.fetcher._merge_key({
                'modelId': 'org/model',
                'filename': 'model-Q8_0-00001-of-00004.gguf',
            }),
            self.fetcher._merge_key({
                'modelId': 'org/model',
                'filename': 'model-Q8_0-00002-of-00004.gguf',
            }),
            self.fetcher._merge_key({
                'modelId': 'org/model',
                'filename': 'model-Q8_0-00004-of-00004.gguf',
            }),
        }
        self.assertEqual(len(keys), 1)
        self.assertEqual(keys.pop(), 'org/model::model-Q8_0.gguf')

    def test_shard_normalization_does_not_merge_distinct_files(self):
        # Different quants (Q8_0 vs F16) must NOT share a merge key just
        # because both are sharded.
        a = self.fetcher._merge_key({
            'modelId': 'org/model',
            'filename': 'model-Q8_0-00001-of-00002.gguf',
        })
        b = self.fetcher._merge_key({
            'modelId': 'org/model',
            'filename': 'model-F16-00001-of-00002.gguf',
        })
        self.assertNotEqual(a, b)

    def test_legacy_shard_link_also_normalized(self):
        key = self.fetcher._merge_key({
            'directDownloadLink':
                'https://huggingface.co/org/model/resolve/main/model-00002-of-00004.gguf',
        })
        self.assertEqual(key, 'org/model::model.gguf')


class TestEstimateFileSize(unittest.TestCase):
    def setUp(self):
        self.fetcher = _make_fetcher(Path(tempfile.mkdtemp()))

    def test_timestamp_not_parsed_as_billions(self):
        # Regression: "1781204855.BF16" was parsed as 1781204855 billion
        # params → 3652861.5 TB. The lookahead must reject it.
        size = self.fetcher._estimate_file_size(
            '1781204855.BF16.gguf', 'Supra Title 350m Exp'
        )
        self.assertLess(size, self.fetcher.MAX_SANE_FILE_SIZE)
        self.assertGreater(size, 0)
        # 7B default @ BF16 (16 bits) ≈ 15 GB
        self.assertAlmostEqual(size / (1024 ** 3), 15.0, delta=2.0)

    def test_real_param_count_still_detected(self):
        size = self.fetcher._estimate_file_size(
            'llama-70b-q4_k_m.gguf', 'Llama 70B'
        )
        # 70B @ Q4_K_M (4.5 bits) ≈ 41 GB
        self.assertAlmostEqual(size / (1024 ** 3), 41.3, delta=5.0)

    def test_small_model(self):
        size = self.fetcher._estimate_file_size(
            'phi-2.5b-q4_k_m.gguf', 'Phi 2.5b'
        )
        # 2.5B @ Q4_K_M ≈ 1.5 GB
        self.assertAlmostEqual(size / (1024 ** 3), 1.5, delta=0.5)

    def test_decimal_version_not_misread_as_params(self):
        # "3.5" here is a version, not params — only the "4b" should count
        size = self.fetcher._estimate_file_size(
            'qwen3.5-4b-q4_k_m.gguf', 'Qwen3.5 4B'
        )
        # 4B @ Q4_K_M ≈ 2.4 GB (NOT 3.5B worth of extra params)
        self.assertAlmostEqual(size / (1024 ** 3), 2.4, delta=0.5)


class TestSaveOutput(unittest.TestCase):
    def _write_existing(self, tmp: Path, entries):
        (tmp / 'out.json').write_text(json.dumps(entries), encoding='utf-8')

    def test_incremental_merge_preserves_legacy_entries(self):
        # Regression: merging 1 new model into 3 legacy entries must yield 4.
        with tempfile.TemporaryDirectory() as d:
            tmp = Path(d)
            legacy = [
                {
                    'modelName': f'Legacy Model {i}',
                    'directDownloadLink':
                        f'https://huggingface.co/org/m{i}/resolve/main/m{i}.gguf',
                    'fileSize': 1000,
                }
                for i in range(3)
            ]
            self._write_existing(tmp, legacy)
            fetcher = _make_fetcher(tmp)
            new = [{
                'modelName': 'Brand New Model',
                'modelId': 'org/m-new',
                'filename': 'm-new.gguf',
                'directDownloadLink':
                    'https://huggingface.co/org/m-new/resolve/main/m-new.gguf',
                'fileSize': 2000,
            }]
            fetcher._save_output(new)

            result = json.loads((tmp / 'out.json').read_text(encoding='utf-8'))
            self.assertEqual(len(result), 4)
            names = {m['modelName'] for m in result}
            self.assertIn('Brand New Model', names)
            self.assertTrue(any('Legacy Model 0' == m['modelName'] for m in result))

    def test_legacy_entries_backfilled_with_model_id_and_filename(self):
        with tempfile.TemporaryDirectory() as d:
            tmp = Path(d)
            legacy = [{
                'modelName': 'Legacy',
                'directDownloadLink':
                    'https://huggingface.co/org/model/resolve/main/file.gguf',
                'fileSize': 1000,
            }]
            self._write_existing(tmp, legacy)
            fetcher = _make_fetcher(tmp)
            fetcher._save_output([])  # merge no new models

            result = json.loads((tmp / 'out.json').read_text(encoding='utf-8'))
            self.assertEqual(len(result), 1)
            self.assertEqual(result[0]['modelId'], 'org/model')
            self.assertEqual(result[0]['filename'], 'file.gguf')

    def test_bogus_size_clamped(self):
        # Regression: "Supra Title 350m Exp" had fileSize 4e18 (3652861.5 TB)
        with tempfile.TemporaryDirectory() as d:
            tmp = Path(d)
            self._write_existing(tmp, [])
            fetcher = _make_fetcher(tmp)
            bogus = [{
                'modelName': 'Supra Title 350m Exp',
                'directDownloadLink':
                    'https://huggingface.co/org/supra/resolve/main/'
                    '1781204855.BF16.gguf',
                'fileSize': 4_000_000_000_000_000_000,  # 4e18 bytes
            }]
            fetcher._save_output(bogus)

            result = json.loads((tmp / 'out.json').read_text(encoding='utf-8'))
            self.assertEqual(len(result), 1)
            self.assertLess(result[0]['fileSize'], fetcher.MAX_SANE_FILE_SIZE)
            self.assertGreater(result[0]['fileSize'], 0)
            # Re-estimated from the filename (7B @ BF16 ≈ 14.7 GB) — delta,
            # not exact string, so the formatter/estimator can evolve.
            self.assertAlmostEqual(result[0]['fileSize'] / (1024 ** 3), 14.7, delta=1.0)
            self.assertNotIn('TB', result[0]['fileSizeFormatted'])
            self.assertEqual(result[0]['modelId'], 'org/supra')
            self.assertEqual(result[0]['filename'], '1781204855.BF16.gguf')

    def test_full_replace_mode(self):
        with tempfile.TemporaryDirectory() as d:
            tmp = Path(d)
            self._write_existing(tmp, [{
                'modelName': 'Old',
                'directDownloadLink':
                    'https://huggingface.co/org/old/resolve/main/old.gguf',
                'fileSize': 100,
            }])
            fetcher = _make_fetcher(tmp, incremental=False)
            fetcher._save_output([{
                'modelName': 'Fresh',
                'modelId': 'org/fresh',
                'filename': 'fresh.gguf',
                'directDownloadLink':
                    'https://huggingface.co/org/fresh/resolve/main/fresh.gguf',
                'fileSize': 200,
            }])

            result = json.loads((tmp / 'out.json').read_text(encoding='utf-8'))
            self.assertEqual(len(result), 1)
            self.assertEqual(result[0]['modelName'], 'Fresh')


class TestDeduplicateKeepsAllFiles(unittest.TestCase):
    """Multi-file support: _deduplicate must keep EVERY GGUF file of the
    winning repo so the UI can offer a file/quantization selector."""

    def setUp(self):
        self.fetcher = _make_fetcher(Path(tempfile.mkdtemp()))

    def _entry(self, model_id, filename, likes=0, downloads=0, size=1024):
        return {
            'modelId': model_id,
            'filename': filename,
            'likeCount': likes,
            'downloadCount': downloads,
            'fileSize': size,
        }

    def test_keeps_all_files_from_winning_repo(self):
        # Same base model in two repos (canonical name matches after org strip);
        # winning repo has 3 quant files
        models = [
            self._entry('org1/qwen3-30b', 'model-Q4_K_M.gguf', likes=900, size=4_000_000_000),
            self._entry('org1/qwen3-30b', 'model-Q8_0.gguf', likes=900, size=8_000_000_000),
            self._entry('org1/qwen3-30b', 'model-F16.gguf', likes=900, size=16_000_000_000),
            self._entry('org2/qwen3-30b', 'model-Q4_K_M.gguf', likes=10, size=4_000_000_000),
        ]
        result = self.fetcher._deduplicate(models)
        # All 3 files of the winning repo survive; losing repo dropped
        self.assertEqual(len(result), 3)
        self.assertTrue(all(m['modelId'] == 'org1/qwen3-30b' for m in result))

    def test_winning_repo_chosen_by_engagement(self):
        models = [
            self._entry('org-low/qwen3-30b', 'a.gguf', likes=5, downloads=10),
            self._entry('org-high/qwen3-30b', 'a.gguf', likes=50, downloads=10),
        ]
        result = self.fetcher._deduplicate(models)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['modelId'], 'org-high/qwen3-30b')

    def test_files_sorted_biggest_first(self):
        models = [
            self._entry('org/best', 'small.gguf', size=100),
            self._entry('org/best', 'big.gguf', size=1_000_000_000),
        ]
        result = self.fetcher._deduplicate(models)
        self.assertEqual(result[0]['filename'], 'big.gguf')

    def test_max_files_cap_applied(self):
        self.fetcher.MAX_FILES_PER_MODEL = 2
        models = [
            self._entry('org/best', f'q{i}.gguf', size=i)
            for i in range(5)
        ]
        result = self.fetcher._deduplicate(models)
        self.assertEqual(len(result), 2)

    def test_single_file_model_untouched(self):
        models = [self._entry('org/one', 'only.gguf')]
        result = self.fetcher._deduplicate(models)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['filename'], 'only.gguf')

    def test_empty_input(self):
        self.assertEqual(self.fetcher._deduplicate([]), [])


class TestMeaningfulGgufFilter(unittest.TestCase):
    """_is_meaningful_gguf must drop mmproj/MTP auxiliary weights but KEEP
    every shard part — parts are re-combined later by _aggregate_shard_sizes."""

    def test_keeps_single_quant_file(self):
        self.assertTrue(DailyGGUFFetcher._is_meaningful_gguf('model-Q4_K_M.gguf'))
        self.assertTrue(DailyGGUFFetcher._is_meaningful_gguf('Qwen3-8B-Q8_0.gguf'))

    def test_keeps_all_shard_parts(self):
        # All parts of a split pass the filter (aggregation re-combines them)
        self.assertTrue(DailyGGUFFetcher._is_meaningful_gguf('model-Q8_0-00001-of-00002.gguf'))
        self.assertTrue(DailyGGUFFetcher._is_meaningful_gguf('model-Q8_0-00002-of-00002.gguf'))
        self.assertTrue(DailyGGUFFetcher._is_meaningful_gguf('BF16/model-BF16-00001-of-00004.gguf'))
        self.assertTrue(DailyGGUFFetcher._is_meaningful_gguf('BF16/model-BF16-00004-of-00004.gguf'))

    def test_shard_variants(self):
        # 1-3 digit part numbers all kept
        self.assertTrue(DailyGGUFFetcher._is_meaningful_gguf('model-1-of-2.gguf'))
        self.assertTrue(DailyGGUFFetcher._is_meaningful_gguf('model-2-of-2.gguf'))
        # Shards with suffixes (imatrix etc.) kept
        self.assertTrue(DailyGGUFFetcher._is_meaningful_gguf('model-00001-of-00002-imatrix.gguf'))
        self.assertTrue(DailyGGUFFetcher._is_meaningful_gguf('model-00002-of-00002-imatrix.gguf'))
        # N-of-M with a leading dash still recognized as a shard (kept)
        self.assertTrue(DailyGGUFFetcher._is_meaningful_gguf('model-32-of-2025.gguf'))

    def test_drops_mmproj_and_mtp(self):
        self.assertFalse(DailyGGUFFetcher._is_meaningful_gguf('mmproj-F32.gguf'))
        self.assertFalse(DailyGGUFFetcher._is_meaningful_gguf('mmproj/model-mmproj-Q8_0.gguf'))
        self.assertFalse(DailyGGUFFetcher._is_meaningful_gguf('MTP/mtp-model-BF16.gguf'))
        self.assertFalse(DailyGGUFFetcher._is_meaningful_gguf('mtp-model-F16.gguf'))

    def test_non_gguf_rejected(self):
        self.assertFalse(DailyGGUFFetcher._is_meaningful_gguf('README.md'))
        self.assertFalse(DailyGGUFFetcher._is_meaningful_gguf(''))


class TestShardBaseName(unittest.TestCase):
    """_shard_base_name maps every part of a split to one key."""

    def test_strips_shard_suffix(self):
        self.assertEqual(
            DailyGGUFFetcher._shard_base_name('model-Q8_0-00001-of-00002.gguf'),
            'model-Q8_0.gguf',
        )
        self.assertEqual(
            DailyGGUFFetcher._shard_base_name('model-Q8_0-00002-of-00002.gguf'),
            'model-Q8_0.gguf',
        )

    def test_preserves_subdirs_and_suffixes(self):
        self.assertEqual(
            DailyGGUFFetcher._shard_base_name('BF16/model-BF16-00001-of-00004.gguf'),
            'BF16/model-BF16.gguf',
        )
        self.assertEqual(
            DailyGGUFFetcher._shard_base_name('model-00002-of-00002-imatrix.gguf'),
            'model-imatrix.gguf',
        )

    def test_non_shard_unchanged(self):
        self.assertEqual(
            DailyGGUFFetcher._shard_base_name('model-Q4_K_M.gguf'),
            'model-Q4_K_M.gguf',
        )
        self.assertEqual(DailyGGUFFetcher._shard_base_name(''), '')


class TestAggregateShardSizes(unittest.TestCase):
    """_aggregate_shard_sizes sums sibling shard sizes into one entry."""

    def setUp(self):
        self.fetcher = _make_fetcher(Path(tempfile.mkdtemp()))

    def _entry(self, model_id, filename, size):
        return {
            'modelId': model_id,
            'filename': filename,
            'fileSize': size,
            'fileSizeFormatted': f'{size} B',
        }

    def test_sums_two_part_shard(self):
        entries = [
            self._entry('org/m', 'model-BF16-00001-of-00002.gguf', 70_000_000_000),
            self._entry('org/m', 'model-BF16-00002-of-00002.gguf', 70_000_000_000),
        ]
        result = self.fetcher._aggregate_shard_sizes(entries)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['fileSize'], 140_000_000_000)
        self.assertEqual(result[0]['shardParts'], 2)
        # First part's metadata retained
        self.assertEqual(result[0]['filename'], 'model-BF16-00001-of-00002.gguf')

    def test_sums_four_part_shard(self):
        entries = [
            self._entry('org/m', f'BF16/model-BF16-0000{i}-of-00004.gguf', 25_000_000_000)
            for i in (1, 2, 3, 4)
        ]
        result = self.fetcher._aggregate_shard_sizes(entries)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['fileSize'], 100_000_000_000)
        self.assertEqual(result[0]['shardParts'], 4)

    def test_different_quants_stay_separate(self):
        entries = [
            self._entry('org/m', 'model-Q8_0-00001-of-00002.gguf', 50_000_000_000),
            self._entry('org/m', 'model-Q8_0-00002-of-00002.gguf', 50_000_000_000),
            self._entry('org/m', 'model-Q4_K_M.gguf', 25_000_000_000),
        ]
        result = self.fetcher._aggregate_shard_sizes(entries)
        self.assertEqual(len(result), 2)
        sizes = {e['filename']: e['fileSize'] for e in result}
        self.assertEqual(sizes.get('model-Q8_0-00001-of-00002.gguf'), 100_000_000_000)
        self.assertEqual(sizes.get('model-Q4_K_M.gguf'), 25_000_000_000)

    def test_inflated_shard_sum_reestimated(self):
        # HF list API sometimes reports each shard at FULL model size, so the
        # sum is Nx too big (27.1 TB for a 550B BF16). The aggregate must fall
        # back to the size estimator instead of trusting the inflated sum.
        entries = [
            self._entry('org/m', f'BF16/NVIDIA-Nemotron-3-Ultra-550B-A55B-BF16-0000{i:02d}-of-00024.gguf', 1_130_000_000_000)
            for i in range(1, 25)
        ]
        result = self.fetcher._aggregate_shard_sizes(entries)
        self.assertEqual(len(result), 1)
        # 24 parts x 1.13 TB = 27.1 TB would exceed the 2 TiB sanity cap, so
        # the estimator (550B BF16) should produce ~1.2 TB, not 27 TB.
        self.assertLess(result[0]['fileSize'], 10_000_000_000_000)
        self.assertGreater(result[0]['fileSize'], 500_000_000_000)

    def test_unsplit_file_not_merged_with_sharded_sibling(self):
        # A repo shipping BOTH an unsplit model-fp16.gguf and a sharded
        # model-fp16-00001-of-00002.gguf has two DISTINCT files. The unsplit
        # one must pass through untouched, never summed into the shard group.
        entries = [
            self._entry('org/m', 'model-fp16.gguf', 200_000_000_000),
            self._entry('org/m', 'model-fp16-00001-of-00002.gguf', 70_000_000_000),
            self._entry('org/m', 'model-fp16-00002-of-00002.gguf', 70_000_000_000),
        ]
        result = self.fetcher._aggregate_shard_sizes(entries)
        self.assertEqual(len(result), 2)
        sizes = {e['filename']: e['fileSize'] for e in result}
        self.assertEqual(sizes.get('model-fp16.gguf'), 200_000_000_000)
        sharded = [e for e in result if e['filename'].startswith('model-fp16-0000')]
        self.assertEqual(len(sharded), 1)
        self.assertEqual(sharded[0]['fileSize'], 140_000_000_000)
        self.assertEqual(sharded[0]['shardParts'], 2)

    def test_single_entries_untouched(self):
        entries = [self._entry('org/m', 'model-Q4_K_M.gguf', 25_000_000_000)]
        result = self.fetcher._aggregate_shard_sizes(entries)
        self.assertEqual(len(result), 1)
        self.assertNotIn('shardParts', result[0])

    def test_empty_input(self):
        self.assertEqual(self.fetcher._aggregate_shard_sizes([]), [])


if __name__ == '__main__':
    unittest.main()
