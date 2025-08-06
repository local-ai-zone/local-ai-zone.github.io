#!/usr/bin/env python3
"""
Comprehensive test runner for the spam filter system
"""

import os
import sys
import time
import unittest
from io import StringIO


def run_test_suite():
    """Run the complete test suite and generate a comprehensive report"""
    
    print("=" * 80)
    print("SPAM FILTER COMPREHENSIVE TEST SUITE")
    print("=" * 80)
    
    # Test modules to run
    test_modules = [
        'tests.test_config',
        'tests.test_classifier', 
        'tests.test_quantization_selector',
        'tests.test_backup_manager',
        'tests.test_engine',
        'tests.test_integration',
        'tests.test_validation',
        'tests.test_performance'
    ]
    
    # Results tracking
    results = {}
    total_start_time = time.time()
    
    for module_name in test_modules:
        print(f"\n{'-' * 60}")
        print(f"Running {module_name}")
        print(f"{'-' * 60}")
        
        # Capture test output
        test_output = StringIO()
        
        # Load and run tests
        try:
            # Import the test module
            module = __import__(module_name, fromlist=[''])
            
            # Create test suite
            loader = unittest.TestLoader()
            suite = loader.loadTestsFromModule(module)
            
            # Run tests with custom result handler
            start_time = time.time()
            runner = unittest.TextTestRunner(
                stream=test_output,
                verbosity=2,
                buffer=True
            )
            result = runner.run(suite)
            end_time = time.time()
            
            # Store results
            results[module_name] = {
                'tests_run': result.testsRun,
                'failures': len(result.failures),
                'errors': len(result.errors),
                'skipped': len(result.skipped) if hasattr(result, 'skipped') else 0,
                'success': result.wasSuccessful(),
                'duration': end_time - start_time,
                'output': test_output.getvalue()
            }
            
            # Print summary for this module
            status = "PASSED" if result.wasSuccessful() else "FAILED"
            print(f"Status: {status}")
            print(f"Tests run: {result.testsRun}")
            print(f"Failures: {len(result.failures)}")
            print(f"Errors: {len(result.errors)}")
            print(f"Duration: {end_time - start_time:.2f}s")
            
            # Print failures and errors if any
            if result.failures:
                print("\nFAILURES:")
                for test, traceback in result.failures:
                    print(f"  {test}: {traceback.split('AssertionError:')[-1].strip()}")
            
            if result.errors:
                print("\nERRORS:")
                for test, traceback in result.errors:
                    print(f"  {test}: {traceback.split('Exception:')[-1].strip()}")
        
        except Exception as e:
            print(f"ERROR: Failed to run {module_name}: {e}")
            results[module_name] = {
                'tests_run': 0,
                'failures': 0,
                'errors': 1,
                'skipped': 0,
                'success': False,
                'duration': 0,
                'output': f"Module import/execution error: {e}"
            }
    
    total_end_time = time.time()
    total_duration = total_end_time - total_start_time
    
    # Generate comprehensive summary
    print(f"\n{'=' * 80}")
    print("COMPREHENSIVE TEST SUMMARY")
    print(f"{'=' * 80}")
    
    # Calculate totals
    total_tests = sum(r['tests_run'] for r in results.values())
    total_failures = sum(r['failures'] for r in results.values())
    total_errors = sum(r['errors'] for r in results.values())
    total_skipped = sum(r['skipped'] for r in results.values())
    total_passed = total_tests - total_failures - total_errors - total_skipped
    
    print(f"Total Duration: {total_duration:.2f} seconds")
    print(f"Total Tests Run: {total_tests}")
    print(f"Passed: {total_passed}")
    print(f"Failed: {total_failures}")
    print(f"Errors: {total_errors}")
    print(f"Skipped: {total_skipped}")
    
    success_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0
    print(f"Success Rate: {success_rate:.1f}%")
    
    # Module-by-module breakdown
    print(f"\n{'-' * 60}")
    print("MODULE BREAKDOWN")
    print(f"{'-' * 60}")
    print(f"{'Module':<30} {'Tests':<6} {'Pass':<6} {'Fail':<6} {'Error':<6} {'Time':<8}")
    print(f"{'-' * 60}")
    
    for module_name, result in results.items():
        module_short = module_name.split('.')[-1]
        passed = result['tests_run'] - result['failures'] - result['errors'] - result['skipped']
        print(f"{module_short:<30} {result['tests_run']:<6} {passed:<6} {result['failures']:<6} {result['errors']:<6} {result['duration']:<8.2f}")
    
    # Test categories summary
    print(f"\n{'-' * 60}")
    print("TEST CATEGORY ANALYSIS")
    print(f"{'-' * 60}")
    
    categories = {
        'Unit Tests': ['test_config', 'test_classifier', 'test_quantization_selector', 'test_backup_manager'],
        'Integration Tests': ['test_engine', 'test_integration'],
        'Validation Tests': ['test_validation'],
        'Performance Tests': ['test_performance']
    }
    
    for category, modules in categories.items():
        category_tests = sum(results.get(f'tests.{m}', {}).get('tests_run', 0) for m in modules)
        category_failures = sum(results.get(f'tests.{m}', {}).get('failures', 0) for m in modules)
        category_errors = sum(results.get(f'tests.{m}', {}).get('errors', 0) for m in modules)
        category_passed = category_tests - category_failures - category_errors
        category_success = (category_passed / category_tests * 100) if category_tests > 0 else 0
        
        print(f"{category}: {category_passed}/{category_tests} passed ({category_success:.1f}%)")
    
    # Requirements coverage analysis
    print(f"\n{'-' * 60}")
    print("REQUIREMENTS COVERAGE")
    print(f"{'-' * 60}")
    
    validation_result = results.get('tests.test_validation', {})
    if validation_result.get('success', False):
        print("✓ All requirements validation tests passed")
        print("✓ Requirement 1.1: Finetuned model removal")
        print("✓ Requirement 1.2: Full precision preservation")
        print("✓ Requirement 1.3: Significant size drop filtering")
        print("✓ Requirement 1.4: Trusted uploader preference")
        print("✓ Requirement 1.5: Low download filtering")
        print("✓ Requirement 2.1: Backup capability")
        print("✓ Requirement 2.3: Detailed logging")
        print("✓ Requirement 2.4: Summary reporting")
        print("✓ Requirement 4.1: Small model removal")
        print("✓ Requirement 4.2: Small group removal")
    else:
        print("⚠ Some requirements validation tests failed")
    
    # Performance analysis
    print(f"\n{'-' * 60}")
    print("PERFORMANCE ANALYSIS")
    print(f"{'-' * 60}")
    
    performance_result = results.get('tests.test_performance', {})
    if performance_result.get('success', False):
        print("✓ All performance tests passed")
        print("✓ Processing time scales appropriately")
        print("✓ Memory usage is reasonable")
        print("✓ Component performance is balanced")
        print("✓ Concurrent processing is safe")
    else:
        print("⚠ Some performance tests failed or were skipped")
    
    # Final verdict
    print(f"\n{'=' * 80}")
    overall_success = total_failures == 0 and total_errors == 0
    if overall_success:
        print("🎉 ALL TESTS PASSED! The spam filter system is ready for deployment.")
    else:
        print("❌ SOME TESTS FAILED. Please review the failures above.")
    print(f"{'=' * 80}")
    
    return overall_success, results


def main():
    """Main entry point"""
    # Change to the project root directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    os.chdir(project_root)
    
    # Add project root to Python path
    if project_root not in sys.path:
        sys.path.insert(0, project_root)
    
    # Run the test suite
    success, results = run_test_suite()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()