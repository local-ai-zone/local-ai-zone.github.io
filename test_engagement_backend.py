#!/usr/bin/env python3
"""
Comprehensive test suite for engagement metrics functionality in the Python backend.
Tests engagement metric extraction, validation, and processing.
"""

import json
import os
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

# Add the scripts directory to the path so we can import the fetcher
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'scripts'))

try:
    from simplified_gguf_fetcher import SimplifiedGGUFetcher
except ImportError:
    print("Error: Could not import SimplifiedGGUFetcher. Make sure the script is in the scripts/ directory.")
    sys.exit(1)


class TestEngagementMetricsBackend(unittest.TestCase):
    """Test suite for engagement metrics functionality in the backend."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.fetcher = SimplifiedGGUFetcher()
        self.temp_dir = tempfile.mkdtemp()
        self.fetcher.raw_data_file = os.path.join(self.temp_dir, "test_raw_data.json")
        self.fetcher.output_file = os.path.join(self.temp_dir, "test_output.json")
        
        # Mock model data for testing
        self.mock_models = [
            self._create_mock_model("test/model1", likes=150, downloads=5000),
            self._create_mock_model("test/model2", likes=0, downloads=3000),
            self._create_mock_model("test/model3", likes=None, downloads=2000),
            self._create_mock_model("test/model4", likes="invalid", downloads=1000),
            self._create_mock_model("test/model5", likes=25.7, downloads=4000),
            self._create_mock_model("test/model6", likes=-10, downloads=1500),
            self._create_mock_model("test/model7", likes=50000000, downloads=6000),  # Extremely high
        ]
    
    def tearDown(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def _create_mock_model(self, model_id, likes=0, downloads=0):
        """Create a mock model object for testing."""
        mock_model = Mock()
        mock_model.id = model_id
        mock_model.downloads = downloads
        mock_model.likes = likes
        mock_model.tags = ['gguf']
        mock_model.siblings = []
        mock_model.cardData = {}
        mock_model.lastModified = datetime.now()
        mock_model.created_at = datetime.now()
        return mock_model
    
    def test_validate_engagement_metric_valid_values(self):
        """Test engagement metric validation with valid values."""
        test_cases = [
            (42, 42, "Valid positive integer"),
            (0, 0, "Valid zero"),
            (1500000, 1500000, "Valid large number"),
            (25.7, 25, "Float number should be converted to int"),
        ]
        
        for input_value, expected, description in test_cases:
            with self.subTest(input_value=input_value, description=description):
                result = self.fetcher._validate_engagement_metric(input_value, "test-model", "likes")
                self.assertEqual(result, expected, f"Failed for {description}")
    
    def test_validate_engagement_metric_invalid_values(self):
        """Test engagement metric validation with invalid values."""
        test_cases = [
            (None, 0, "None value"),
            ("", 0, "Empty string"),
            ("null", 0, "String 'null'"),
            ("N/A", 0, "String 'N/A'"),
            ("invalid", 0, "Invalid string"),
            (-10, 0, "Negative number"),
            (float('nan'), 0, "NaN value"),
            (float('inf'), 0, "Infinity value"),
            ([1, 2, 3], 0, "Array value"),
            ({"likes": 42}, 0, "Object value"),
        ]
        
        for input_value, expected, description in test_cases:
            with self.subTest(input_value=input_value, description=description):
                result = self.fetcher._validate_engagement_metric(input_value, "test-model", "likes")
                self.assertEqual(result, expected, f"Failed for {description}")
    
    def test_validate_engagement_metric_extreme_values(self):
        """Test engagement metric validation with extreme values."""
        # Test extremely large value (should be capped)
        result = self.fetcher._validate_engagement_metric(50000000, "test-model", "likes")
        self.assertEqual(result, 10000000, "Extremely large values should be capped at 10M")
        
        # Test string that can be converted to number
        result = self.fetcher._validate_engagement_metric("123", "test-model", "likes")
        self.assertEqual(result, 123, "Valid number strings should be converted")
    
    def test_batch_fetch_model_details_engagement_stats(self):
        """Test that batch fetching correctly tracks engagement statistics."""
        engagement_stats = {
            'models_with_likes': 0,
            'models_missing_likes': 0,
            'total_likes': 0,
            'max_likes': 0,
            'min_likes': float('inf')
        }
        
        # Mock the API calls
        with patch.object(self.fetcher.api, 'model_info') as mock_model_info:
            # Set up mock responses
            mock_responses = []
            for model in self.mock_models:
                mock_response = Mock()
                mock_response.likes = model.likes
                mock_response.siblings = []
                mock_responses.append(mock_response)
            
            mock_model_info.side_effect = mock_responses
            
            # Run batch fetch
            result = self.fetcher._batch_fetch_model_details(self.mock_models, engagement_stats)
            
            # Verify results
            self.assertEqual(len(result), len(self.mock_models), "Should process all models")
            
            # Check engagement statistics
            self.assertGreater(engagement_stats['models_with_likes'], 0, "Should have models with likes")
            self.assertGreater(engagement_stats['total_likes'], 0, "Should have total likes > 0")
            self.assertGreaterEqual(engagement_stats['max_likes'], 0, "Should track max likes")
    
    def test_save_raw_data_with_engagement_metrics(self):
        """Test saving raw data includes engagement metrics."""
        # Mock the batch fetch method
        with patch.object(self.fetcher, '_batch_fetch_model_details') as mock_batch_fetch:
            mock_batch_fetch.return_value = [
                {
                    'id': 'test/model1',
                    'downloads': 5000,
                    'likes': 150,
                    'tags': ['gguf'],
                    'siblings': [],
                    'cardData': {},
                    'lastModified': '2024-01-01T00:00:00',
                    'created_at': '2024-01-01T00:00:00'
                }
            ]
            
            # Run save raw data
            self.fetcher._save_raw_data(self.mock_models[:1])
            
            # Verify file was created and contains engagement metrics
            self.assertTrue(os.path.exists(self.fetcher.raw_data_file), "Raw data file should be created")
            
            with open(self.fetcher.raw_data_file, 'r') as f:
                data = json.load(f)
            
            self.assertEqual(len(data), 1, "Should save one model")
            self.assertIn('likes', data[0], "Should include likes field")
            self.assertEqual(data[0]['likes'], 150, "Should save correct likes value")
    
    def test_generate_output_includes_engagement_metrics(self):
        """Test that output generation includes engagement metrics in the correct format."""
        # Create test processed models
        processed_models = [
            {
                'modelName': 'test-model-1.gguf',
                'quantFormat': 'Q4_K_M',
                'fileSize': 4000000000,
                'fileSizeFormatted': '4.0 GB',
                'modelType': 'LLaMA',
                'license': 'Apache-2.0',
                'downloadCount': 5000,
                'likeCount': 150,
                'huggingFaceLink': 'https://huggingface.co/test/model1',
                'directDownloadLink': 'https://example.com/model1.gguf'
            },
            {
                'modelName': 'test-model-2.gguf',
                'quantFormat': 'Q4_K_M',
                'fileSize': 3000000000,
                'fileSizeFormatted': '3.0 GB',
                'modelType': 'Mistral',
                'license': 'MIT',
                'downloadCount': 3000,
                'likeCount': 0,
                'huggingFaceLink': 'https://huggingface.co/test/model2',
                'directDownloadLink': 'https://example.com/model2.gguf'
            }
        ]
        
        # Run output generation
        self.fetcher._generate_output(processed_models)
        
        # Verify output file was created
        self.assertTrue(os.path.exists(self.fetcher.output_file), "Output file should be created")
        
        # Load and verify output
        with open(self.fetcher.output_file, 'r') as f:
            output_data = json.load(f)
        
        self.assertEqual(len(output_data), 2, "Should output two models")
        
        # Verify engagement metrics are included
        for model in output_data:
            self.assertIn('likeCount', model, "Should include likeCount field")
            self.assertIsInstance(model['likeCount'], int, "likeCount should be integer")
            self.assertGreaterEqual(model['likeCount'], 0, "likeCount should be non-negative")
        
        # Verify sorting (should be by downloads desc, then likes desc)
        self.assertGreaterEqual(output_data[0]['downloadCount'], output_data[1]['downloadCount'],
                               "Should be sorted by download count")
    
    def test_generate_output_validates_engagement_metrics(self):
        """Test that output generation validates and fixes invalid engagement metrics."""
        # Create test data with invalid engagement metrics
        processed_models = [
            {
                'modelName': 'invalid-likes-model.gguf',
                'quantFormat': 'Q4_K_M',
                'fileSize': 4000000000,
                'fileSizeFormatted': '4.0 GB',
                'modelType': 'Test',
                'license': 'Apache-2.0',
                'downloadCount': 1000,
                'likeCount': 'invalid',  # Invalid value
                'huggingFaceLink': 'https://huggingface.co/test/invalid',
                'directDownloadLink': 'https://example.com/invalid.gguf'
            },
            {
                'modelName': 'negative-likes-model.gguf',
                'quantFormat': 'Q4_K_M',
                'fileSize': 3000000000,
                'fileSizeFormatted': '3.0 GB',
                'modelType': 'Test',
                'license': 'MIT',
                'downloadCount': 2000,
                'likeCount': -50,  # Negative value
                'huggingFaceLink': 'https://huggingface.co/test/negative',
                'directDownloadLink': 'https://example.com/negative.gguf'
            }
        ]
        
        # Run output generation
        self.fetcher._generate_output(processed_models)
        
        # Load and verify output
        with open(self.fetcher.output_file, 'r') as f:
            output_data = json.load(f)
        
        # Verify invalid values were corrected
        for model in output_data:
            self.assertIsInstance(model['likeCount'], int, "likeCount should be integer")
            self.assertGreaterEqual(model['likeCount'], 0, "likeCount should be non-negative")
            self.assertEqual(model['likeCount'], 0, "Invalid values should be set to 0")
    
    def test_generate_output_empty_data(self):
        """Test output generation with empty data."""
        # Run with empty data
        self.fetcher._generate_output([])
        
        # Verify empty output file was created
        self.assertTrue(os.path.exists(self.fetcher.output_file), "Output file should be created")
        
        with open(self.fetcher.output_file, 'r') as f:
            output_data = json.load(f)
        
        self.assertEqual(output_data, [], "Should create empty array for empty input")
    
    def test_engagement_statistics_calculation(self):
        """Test that engagement statistics are calculated correctly."""
        # Create test data with known engagement values
        test_models = [
            {'likeCount': 100},
            {'likeCount': 200},
            {'likeCount': 0},
            {'likeCount': 50}
        ]
        
        # Calculate expected statistics
        like_counts = [model['likeCount'] for model in test_models]
        expected_total = sum(like_counts)  # 350
        expected_models_with_likes = sum(1 for likes in like_counts if likes > 0)  # 3
        expected_max = max(like_counts)  # 200
        expected_avg = expected_total / len(test_models)  # 87.5
        
        # Run output generation to trigger statistics calculation
        processed_models = []
        for i, model in enumerate(test_models):
            processed_models.append({
                'modelName': f'test-model-{i}.gguf',
                'quantFormat': 'Q4_K_M',
                'fileSize': 1000000000,
                'fileSizeFormatted': '1.0 GB',
                'modelType': 'Test',
                'license': 'MIT',
                'downloadCount': 1000,
                'likeCount': model['likeCount'],
                'huggingFaceLink': f'https://huggingface.co/test/model{i}',
                'directDownloadLink': f'https://example.com/model{i}.gguf'
            })
        
        # Capture log output to verify statistics
        with patch('logging.Logger.info') as mock_log:
            self.fetcher._generate_output(processed_models)
            
            # Check that statistics were logged
            log_calls = [call.args[0] for call in mock_log.call_args_list]
            
            # Find engagement statistics logs
            engagement_logs = [log for log in log_calls if 'engagement metrics statistics' in log.lower()]
            self.assertGreater(len(engagement_logs), 0, "Should log engagement statistics")
    
    def test_integration_download_and_process_phases(self):
        """Integration test for complete download and process workflow with engagement metrics."""
        # Mock the HF API
        with patch.object(self.fetcher, '_fetch_recent_models') as mock_recent, \
             patch.object(self.fetcher, '_fetch_top_models') as mock_top, \
             patch.object(self.fetcher.api, 'model_info') as mock_model_info:
            
            # Set up mock data
            mock_recent.return_value = self.mock_models[:3]
            mock_top.return_value = self.mock_models[3:]
            
            # Mock detailed model info responses
            mock_responses = []
            for model in self.mock_models:
                mock_response = Mock()
                mock_response.likes = model.likes
                mock_response.siblings = [
                    Mock(rfilename='test.gguf', size=1000000000)
                ]
                mock_responses.append(mock_response)
            
            mock_model_info.side_effect = mock_responses
            
            # Run download phase
            self.fetcher.download_data()
            
            # Verify raw data was saved with engagement metrics
            self.assertTrue(os.path.exists(self.fetcher.raw_data_file))
            
            with open(self.fetcher.raw_data_file, 'r') as f:
                raw_data = json.load(f)
            
            # Verify engagement metrics are present and validated
            for model in raw_data:
                self.assertIn('likes', model, "Raw data should include likes")
                self.assertIsInstance(model['likes'], int, "Likes should be integer")
                self.assertGreaterEqual(model['likes'], 0, "Likes should be non-negative")
            
            # Run process phase
            self.fetcher.process_data()
            
            # Verify final output includes engagement metrics
            self.assertTrue(os.path.exists(self.fetcher.output_file))
            
            with open(self.fetcher.output_file, 'r') as f:
                output_data = json.load(f)
            
            # Verify output format
            for model in output_data:
                self.assertIn('likeCount', model, "Output should include likeCount")
                self.assertIsInstance(model['likeCount'], int, "likeCount should be integer")
                self.assertGreaterEqual(model['likeCount'], 0, "likeCount should be non-negative")
    
    def test_performance_large_dataset(self):
        """Test performance with a large dataset of models."""
        import time
        
        # Create a large dataset
        large_dataset = []
        for i in range(1000):
            model = self._create_mock_model(f"test/model{i}", likes=i % 100, downloads=i * 10)
            large_dataset.append(model)
        
        # Test validation performance
        start_time = time.time()
        for i, model in enumerate(large_dataset):
            validated_likes = self.fetcher._validate_engagement_metric(
                model.likes, f"model{i}", "likes"
            )
            self.assertIsInstance(validated_likes, int)
        
        validation_time = time.time() - start_time
        
        # Should complete validation in reasonable time (< 1 second for 1000 models)
        self.assertLess(validation_time, 1.0, 
                       f"Validation took {validation_time:.2f}s for 1000 models, should be < 1s")
        
        print(f"Performance test: Validated 1000 models in {validation_time:.3f}s")


class TestEngagementMetricsValidation(unittest.TestCase):
    """Focused tests for engagement metrics validation logic."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.fetcher = SimplifiedGGUFetcher()
    
    def test_string_conversion_edge_cases(self):
        """Test string conversion edge cases."""
        test_cases = [
            ("0", 0),
            ("123", 123),
            ("123.456", 123),
            ("  456  ", 456),  # Whitespace
            ("1,234", 0),  # Comma (invalid)
            ("1.23e3", 1230),  # Scientific notation
            ("", 0),
            ("null", 0),
            ("undefined", 0),
            ("N/A", 0),
            ("none", 0),
        ]
        
        for input_str, expected in test_cases:
            with self.subTest(input_str=input_str):
                result = self.fetcher._validate_engagement_metric(input_str, "test", "likes")
                self.assertEqual(result, expected, f"Failed for string '{input_str}'")
    
    def test_numeric_edge_cases(self):
        """Test numeric edge cases."""
        test_cases = [
            (0, 0),
            (0.0, 0),
            (1.0, 1),
            (1.9, 1),  # Floor conversion
            (2.1, 2),  # Floor conversion
            (-0, 0),
            (-1, 0),  # Negative becomes 0
            (float('inf'), 0),
            (float('-inf'), 0),
            (float('nan'), 0),
        ]
        
        for input_num, expected in test_cases:
            with self.subTest(input_num=input_num):
                result = self.fetcher._validate_engagement_metric(input_num, "test", "likes")
                self.assertEqual(result, expected, f"Failed for number {input_num}")
    
    def test_type_edge_cases(self):
        """Test various data types."""
        test_cases = [
            (True, 1),   # Boolean true
            (False, 0),  # Boolean false
            ([], 0),     # Empty list
            ([1, 2], 0), # Non-empty list
            ({}, 0),     # Empty dict
            ({"likes": 42}, 0),  # Non-empty dict
            (set(), 0),  # Set
            (None, 0),   # None
        ]
        
        for input_val, expected in test_cases:
            with self.subTest(input_val=input_val):
                result = self.fetcher._validate_engagement_metric(input_val, "test", "likes")
                self.assertEqual(result, expected, f"Failed for type {type(input_val)}")


def run_backend_tests():
    """Run all backend engagement metrics tests."""
    print("=" * 60)
    print("ENGAGEMENT METRICS BACKEND TEST SUITE")
    print("=" * 60)
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestEngagementMetricsBackend))
    suite.addTests(loader.loadTestsFromTestCase(TestEngagementMetricsValidation))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2, buffer=True)
    result = runner.run(suite)
    
    # Print summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Success rate: {((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100):.1f}%")
    
    if result.failures:
        print(f"\nFAILURES ({len(result.failures)}):")
        for test, traceback in result.failures:
            print(f"- {test}: {traceback.split('AssertionError: ')[-1].split('\\n')[0]}")
    
    if result.errors:
        print(f"\nERRORS ({len(result.errors)}):")
        for test, traceback in result.errors:
            print(f"- {test}: {traceback.split('\\n')[-2]}")
    
    if result.wasSuccessful():
        print("\n🎉 ALL BACKEND TESTS PASSED!")
        print("✅ Engagement metrics extraction and processing working correctly")
    else:
        print(f"\n⚠️ {len(result.failures) + len(result.errors)} tests failed")
        print("❌ Please review the implementation")
    
    return result.wasSuccessful()


if __name__ == '__main__':
    success = run_backend_tests()
    sys.exit(0 if success else 1)