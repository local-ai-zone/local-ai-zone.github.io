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


if __name__ == '__main__':
    unittest.main()
