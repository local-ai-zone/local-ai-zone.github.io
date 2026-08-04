#!/usr/bin/env python3
"""
Unified test runner: executes the Python fetcher suite.

The Node slug-parity suite is run first by npm test (node --test ...), then
npm delegates here for the Python suite.

Run:  python tests/run_all.py        (or: npm test)
"""
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TESTS = ROOT / 'tests'


def run_python_tests() -> bool:
    """Run the fetcher unit tests via unittest discovery."""
    loader = unittest.TestLoader()
    suite = loader.discover(str(TESTS), pattern='test_*.py')
    result = unittest.TextTestRunner(verbosity=1).run(suite)
    return result.wasSuccessful()


def main() -> int:
    print('=' * 60)
    print('  GGUF PROJECT TEST SUITE (Python)')
    print('=' * 60)

    ok = run_python_tests()

    print('=' * 60)
    print('  RESULT: ' + ('[PASS] ALL TESTS PASSED' if ok else '[FAIL] TESTS FAILED'))
    print('=' * 60)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
