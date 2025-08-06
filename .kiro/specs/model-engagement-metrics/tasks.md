# Implementation Plan

- [x] 1. Enhance Python data extraction to include engagement metrics





  - Modify `_save_raw_data` method to extract `likes` from detailed model info
  - Add error handling for missing engagement data with default values of 0
  - Update logging to track engagement data extraction statistics
  - _Requirements: 3.1, 3.3_

- [x] 2. Update Python data processing to include engagement metrics in output







  - Modify `_extract_model_info` method to pass through like counts to processed entries
  - Update `_generate_output` method to include `likeCount` in final JSON structure
  - Ensure engagement metrics are properly sorted and validated before output
  - _Requirements: 3.1, 3.2_

- [x] 3. Create engagement metrics display utilities





  - Add `formatEngagementNumber` function to format like counts (1.2K, 45, etc.)
  - Create icon mapping for heart icons in engagement display
  - Add CSS classes for engagement metric styling and visual hierarchy
  - _Requirements: 4.1, 4.2_

- [x] 4. Enhance ModelCard component with engagement metrics display





  - Update ModelCard render method to include like count with heart icon
  - Add visual emphasis for high engagement metrics (highlighting, badges)
  - Implement graceful handling when engagement metrics are 0 or unavailable
  - Style engagement metrics section with proper spacing and visual hierarchy
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 5. Add engagement metric filtering to SearchFilter component





  - Create range slider for like count filtering
  - Add engagement filter controls to the filter panel UI
  - Implement filter state management for like ranges
  - Add filter reset functionality for engagement metrics
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 6. Enhance FilterService with engagement metric filtering logic





  - Implement `filterByEngagement` method to filter models by like ranges
  - Add engagement metric sorting option (`sortByLikeCount`)
  - Integrate engagement filters with existing filter combination logic
  - Add validation for engagement filter ranges (min <= max)
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 7. Update Header component with engagement statistics





  - Calculate and display total likes across all models
  - Show average engagement metrics per model in header statistics
  - Update filtered result statistics to include engagement metrics
  - Add engagement data to the header's data freshness display
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 8. Add engagement metric sorting options to UI





  - Add "Likes" option to sort dropdown in SearchFilter component
  - Implement sort state management for engagement metrics
  - Update pagination to maintain engagement-based sorting across pages
  - Add visual indicators for current engagement-based sort selection
  - _Requirements: 1.2, 2.1_

- [x] 9. Integrate engagement metrics into existing state management






  - Update AppState to include engagement filter range in state structure
  - Add engagement metric fields to model data validation
  - Ensure engagement metrics are properly handled in state updates and subscriptions
  - Test state persistence across component interactions with engagement data
  - _Requirements: 2.2, 2.3_

- [x] 10. Add responsive design and mobile optimization for engagement metrics





  - Ensure engagement metrics display properly on mobile devices
  - Optimize engagement filter controls for touch interaction
  - Add responsive breakpoints for engagement metric display in cards
  - Test engagement metric visibility and usability across device sizes
  - _Requirements: 4.1, 4.2_

- [x] 11. Implement error handling and data validation for engagement metrics





  - Add validation for engagement metric data types and ranges
  - Implement fallback display when engagement data is missing or invalid
  - Add error logging for engagement metric processing failures
  - Test graceful degradation when engagement API data is unavailable
  - _Requirements: 3.3, 4.3_

- [x] 12. Create comprehensive tests for engagement metrics functionality





  - Write unit tests for engagement metric extraction and processing
  - Test engagement filtering and sorting functionality
  - Create integration tests for complete engagement metric data flow
  - Add performance tests for filtering and sorting with engagement data
  - _Requirements: 1.1, 1.2, 2.1, 2.2_