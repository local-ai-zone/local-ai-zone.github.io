# Implementation Plan

- [x] 1. Extend configuration system and create hardware calculator module





  - Add hardware calculation fields to FilterConfig dataclass in spam_filter/config.py
  - Create spam_filter/hardware_calculator.py with HardwareRequirementsCalculator class
  - Implement parameter estimation logic using regex patterns for model names and file size fallbacks
  - _Requirements: 3.3, 3.1, 1.1, 1.2, 1.3, 1.4, 2.3, 2.4, 2.5_

- [x] 2. Implement hardware calculation methods








  - Write calculate_ram_requirements method using file size and quantization format with 2x multiplier and 30% quantization reduction
  - Write calculate_cpu_requirements method based on parameter counts (2-4 cores for ≤2B, 6-8 for ~7B, 8-12 for ≥13B)
  - Write determine_gpu_requirement method setting GPU required for ≥13B parameters
  - Write get_os_support method returning default ["Windows", "Linux", "macOS"] list
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 3. Create main calculation orchestration with error handling





  - Implement calculate_requirements method that coordinates all hardware calculations
  - Add error handling with graceful degradation to conservative default values when calculations fail
  - Include logging for successful calculations and fallback scenarios
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.3, 3.4_

- [x] 4. Integrate hardware calculator with processing pipeline




















  - Modify SpamFilterEngine in spam_filter/engine.py to instantiate and use HardwareRequirementsCalculator
  - Add hardware requirements calculation step after model filtering and before output generation
  - Update reduce_model_spam.py to enable hardware requirements calculation and ensure enhanced models are written to output
  - _Requirements: 1.5, 4.4, 4.1, 4.2_