# GGUF Models Sync Configuration Guide

This guide provides comprehensive documentation for configuring and managing the GGUF Models Sync system.

## Table of Contents

1. [Overview](#overview)
2. [Configuration Structure](#configuration-structure)
3. [Environment-Specific Configurations](#environment-specific-configurations)
4. [Configuration Parameters](#configuration-parameters)
5. [Deployment and Management](#deployment-and-management)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)
8. [Examples](#examples)

## Overview

The GGUF Models Sync system uses a comprehensive configuration system that supports:

- **Environment-specific configurations** (development, staging, production)
- **Hierarchical configuration structure** with logical grouping
- **Environment variable overrides** for runtime customization
- **Configuration validation** to prevent errors
- **Easy deployment tools** for configuration management

## Configuration Structure

The configuration system is organized into logical sections:

```yaml
# Basic Settings
environment: production
log_level: INFO
debug_mode: false
dry_run: false

# Component Configurations
rate_limiting: { ... }      # API rate limiting settings
sync_behavior: { ... }      # Sync mode and behavior
validation: { ... }         # Data validation settings
error_handling: { ... }     # Error recovery settings
monitoring: { ... }         # Logging and alerting
performance: { ... }        # Performance optimizations
storage: { ... }            # File and directory settings
notifications: { ... }      # Notification settings
security: { ... }           # Security configurations

# External Services
huggingface_token: null     # Set via environment variable
api_base_url: "https://huggingface.co"

# Workflow Settings
workflow_timeout_hours: 6
enable_github_actions_integration: true
```

## Environment-Specific Configurations

### Available Environments

- **`development`** - Local development with debugging enabled
- **`staging`** - Pre-production testing environment
- **`production`** - Live production environment
- **`testing`** - Automated testing environment

### Configuration Files

- `config/sync-config.yaml` - Active configuration (deployed)
- `config/sync-config-development.yaml` - Development settings
- `config/sync-config-staging.yaml` - Staging settings
- `config/sync-config-production.yaml` - Production settings (same as default)

### Environment Differences

| Setting | Development | Staging | Production |
|---------|-------------|---------|------------|
| Log Level | DEBUG | INFO | INFO |
| Debug Mode | true | false | false |
| Max Concurrency | 10 | 30 | 50 |
| Requests/sec | 0.5 | 1.0 | 1.2 |
| Progress Interval | 5 min | 10 min | 15 min |
| File Verification | false | true | true |
| Notifications | disabled | enabled | enabled |

## Configuration Parameters

### Rate Limiting Configuration

Controls API request rates and concurrency:

```yaml
rate_limiting:
  requests_per_second: 1.2        # API requests per second
  requests_per_hour: 5000         # Hourly rate limit (authenticated)
  max_concurrent_requests: 50     # Maximum concurrent requests
  backoff_base: 2.0              # Exponential backoff base
  backoff_jitter: true           # Add jitter to backoff
  max_retries: 5                 # Maximum retry attempts
  timeout_seconds: 30            # Request timeout
```

### Sync Behavior Configuration

Controls sync modes and behavior:

```yaml
sync_behavior:
  mode: auto                          # auto, incremental, full
  incremental_window_hours: 48        # Incremental sync window
  full_sync_threshold_hours: 168      # Weekly full sync trigger
  significant_change_threshold: 0.1   # 10% change triggers full sync
  force_full_sync: false             # Force full sync override
  enable_multi_strategy_discovery: true
  enable_deduplication: true
```

**Sync Modes:**
- `auto` - Automatically choose between incremental and full
- `incremental` - Only sync recently modified models
- `full` - Sync all models regardless of modification date

### Validation Configuration

Controls data validation and quality checks:

```yaml
validation:
  enable_schema_validation: true      # Validate data structure
  enable_file_verification: true     # Verify file accessibility
  enable_completeness_checking: true # Check sync completeness
  min_completeness_score: 0.95      # Minimum completeness threshold
  enable_quality_scoring: true       # Calculate quality metrics
  enable_automatic_fixes: true       # Auto-fix common issues
  validation_timeout_seconds: 300    # Validation timeout
```

### Error Handling Configuration

Controls error recovery and resilience:

```yaml
error_handling:
  enable_error_recovery: true         # Enable automatic recovery
  enable_exponential_backoff: true   # Use exponential backoff
  enable_categorized_errors: true    # Categorize error types
  enable_notifications: true         # Send error notifications
  max_recovery_attempts: 3           # Maximum recovery attempts
  recovery_delay_seconds: 60         # Delay between recovery attempts
  preserve_data_on_failure: true     # Keep previous data on failure
```

### Monitoring Configuration

Controls logging, progress tracking, and alerting:

```yaml
monitoring:
  enable_detailed_logging: true           # Detailed log output
  enable_progress_tracking: true         # Track sync progress
  progress_report_interval_seconds: 900  # Progress report frequency (15 min)
  enable_performance_metrics: true       # Collect performance data
  enable_alerts: true                    # Enable alerting
  alert_channels: [log, github]          # Alert delivery channels
  enable_dashboard: false                # Enable monitoring dashboard
```

### Performance Configuration

Controls performance optimizations:

```yaml
performance:
  enable_streaming_processing: true  # Stream large datasets
  enable_data_compression: true      # Compress stored data
  enable_caching: true              # Enable result caching
  cache_ttl_hours: 24               # Cache time-to-live
  memory_limit_mb: 2048             # Memory usage limit
  enable_parallel_processing: true   # Enable parallelization
  chunk_size: 100                   # Processing chunk size
  enable_adaptive_parameters: true   # Auto-adjust parameters
```

### Storage Configuration

Controls file storage and organization:

```yaml
storage:
  data_directory: "data"              # Main data directory
  backup_directory: "data/backups"    # Backup storage
  reports_directory: "reports"        # Report storage
  logs_directory: "logs"              # Log file storage
  enable_backups: true               # Enable automatic backups
  backup_retention_days: 30          # Backup retention period
  enable_compression: true           # Compress stored files
```

### Notification Configuration

Controls notification delivery:

```yaml
notifications:
  enable_success_notifications: false    # Notify on success
  enable_failure_notifications: true     # Notify on failure
  enable_warning_notifications: true     # Notify on warnings
  enable_critical_notifications: true    # Notify on critical issues
  notification_channels: [log]           # Delivery channels
  webhook_urls: []                       # Webhook endpoints
  email_recipients: []                   # Email recipients
```

### Security Configuration

Controls security settings:

```yaml
security:
  enable_token_validation: true      # Validate API tokens
  enable_rate_limit_protection: true # Protect against rate limits
  enable_request_signing: false     # Sign API requests
  enable_audit_logging: true        # Log security events
  mask_sensitive_data: true         # Mask sensitive information
  allowed_domains: ["huggingface.co"] # Allowed API domains
```

## Deployment and Management

### Using the Deployment Scripts

#### Deploy Configuration

```bash
# Deploy production configuration
./scripts/deploy-config.sh deploy production

# Deploy with custom source
./scripts/deploy-config.sh deploy staging --source config/custom-config.yaml

# Deploy without validation (not recommended)
./scripts/deploy-config.sh deploy development --no-validate

# Force deployment without confirmation
./scripts/deploy-config.sh deploy production --force
```

#### Create Environment Configuration

```bash
# Create new environment configuration
./scripts/deploy-config.sh create development

# Create based on existing configuration
./scripts/deploy-config.sh create testing --base config/sync-config-staging.yaml
```

#### Validate Configurations

```bash
# Validate all configurations
./scripts/deploy-config.sh validate

# List available configurations
./scripts/deploy-config.sh list

# Compare configurations
./scripts/deploy-config.sh compare sync-config-development.yaml sync-config-production.yaml
```

#### Backup and Restore

```bash
# Backup current configuration
./scripts/deploy-config.sh backup

# Restore from backup
./scripts/deploy-config.sh restore sync-config_backup_20240130_143022.yaml
```

### Using Python Scripts

```bash
# Deploy using Python script
python scripts/deploy_config.py deploy production

# Create new environment
python scripts/deploy_config.py create development

# Validate configurations
python scripts/deploy_config.py validate

# List configurations
python scripts/deploy_config.py list

# Compare configurations
python scripts/deploy_config.py compare config1.yaml config2.yaml
```

### Environment Variable Overrides

You can override any configuration setting using environment variables:

```bash
# Sync behavior
export SYNC_MODE=full
export FORCE_FULL_SYNC=true
export INCREMENTAL_WINDOW_HOURS=24

# Rate limiting
export MAX_CONCURRENCY=30
export REQUESTS_PER_SECOND=1.0
export MAX_RETRIES=3

# Monitoring
export ENABLE_DETAILED_LOGGING=true
export PROGRESS_REPORT_INTERVAL=600

# API settings
export HUGGINGFACE_TOKEN=your_token_here
export WORKFLOW_TIMEOUT_HOURS=4
```

## Best Practices

### Configuration Management

1. **Use Environment-Specific Configs**
   - Keep separate configurations for each environment
   - Test changes in development/staging before production
   - Use version control for all configuration files

2. **Validate Before Deployment**
   - Always validate configurations before deployment
   - Use the built-in validation tools
   - Test configuration changes in non-production environments

3. **Backup Configurations**
   - Backup configurations before making changes
   - Keep backups for rollback capability
   - Document configuration changes

4. **Use Environment Variables for Secrets**
   - Never store API tokens in configuration files
   - Use environment variables for sensitive data
   - Use secure secret management in production

### Performance Tuning

1. **Rate Limiting**
   - Use authenticated tokens for higher rate limits
   - Adjust concurrency based on your infrastructure
   - Monitor API usage to avoid rate limiting

2. **Sync Behavior**
   - Use incremental sync for regular updates
   - Schedule full syncs during low-traffic periods
   - Adjust sync windows based on data freshness needs

3. **Resource Management**
   - Set appropriate memory limits
   - Enable streaming for large datasets
   - Use compression to reduce storage requirements

### Monitoring and Alerting

1. **Enable Comprehensive Logging**
   - Use detailed logging in production
   - Set appropriate log levels for each environment
   - Monitor log files for errors and warnings

2. **Configure Alerts**
   - Enable failure notifications
   - Set up critical error alerts
   - Monitor completeness scores

3. **Track Performance Metrics**
   - Enable performance monitoring
   - Track sync duration and success rates
   - Monitor resource usage

## Troubleshooting

### Common Configuration Issues

#### Invalid Environment
```
Error: Invalid environment: prod
Valid environments: development, staging, production, testing
```
**Solution:** Use one of the valid environment names.

#### Configuration Validation Failed
```
Error: Configuration validation failed: Min completeness score must be between 0 and 1
```
**Solution:** Check the validation errors and fix the configuration values.

#### Missing Configuration File
```
Error: Environment configuration not found: config/sync-config-development.yaml
```
**Solution:** Create the environment configuration first:
```bash
./scripts/deploy-config.sh create development
```

#### Token Not Found
```
Error: Hugging Face token is required
```
**Solution:** Set the HUGGINGFACE_TOKEN environment variable:
```bash
export HUGGINGFACE_TOKEN=your_token_here
```

### Configuration Debugging

1. **Check Current Configuration**
   ```bash
   python scripts/deploy_config.py list
   ```

2. **Validate Configuration**
   ```bash
   python scripts/deploy_config.py validate
   ```

3. **Compare Configurations**
   ```bash
   python scripts/deploy_config.py compare current.yaml expected.yaml
   ```

4. **Check Environment Variables**
   ```bash
   env | grep SYNC_
   env | grep HUGGINGFACE_
   ```

### Performance Issues

1. **Slow Sync Performance**
   - Increase `max_concurrent_requests`
   - Adjust `requests_per_second`
   - Enable `streaming_processing`
   - Check network connectivity

2. **Memory Issues**
   - Reduce `chunk_size`
   - Enable `streaming_processing`
   - Increase `memory_limit_mb`
   - Enable `data_compression`

3. **Rate Limiting Issues**
   - Ensure `HUGGINGFACE_TOKEN` is set
   - Reduce `requests_per_second`
   - Enable `backoff_jitter`
   - Check API quota usage

## Examples

### Development Configuration

```yaml
# config/sync-config-development.yaml
environment: development
log_level: DEBUG
debug_mode: true

rate_limiting:
  requests_per_second: 0.5
  max_concurrent_requests: 10
  max_retries: 3

sync_behavior:
  mode: incremental
  incremental_window_hours: 24

validation:
  min_completeness_score: 0.8
  enable_file_verification: false

monitoring:
  progress_report_interval_seconds: 300
  enable_alerts: false

performance:
  enable_streaming_processing: false
  enable_parallel_processing: false
```

### Production Configuration

```yaml
# config/sync-config-production.yaml
environment: production
log_level: INFO
debug_mode: false

rate_limiting:
  requests_per_second: 1.2
  max_concurrent_requests: 50
  max_retries: 5

sync_behavior:
  mode: auto
  incremental_window_hours: 48
  full_sync_threshold_hours: 168

validation:
  min_completeness_score: 0.95
  enable_file_verification: true

error_handling:
  preserve_data_on_failure: true
  enable_notifications: true

monitoring:
  enable_detailed_logging: true
  progress_report_interval_seconds: 900
  enable_alerts: true

security:
  enable_audit_logging: true
  mask_sensitive_data: true
```

### Custom Configuration for High-Volume Sync

```yaml
# config/sync-config-high-volume.yaml
environment: production
log_level: INFO

rate_limiting:
  requests_per_second: 2.0
  max_concurrent_requests: 100
  requests_per_hour: 7000

sync_behavior:
  mode: full
  enable_multi_strategy_discovery: true

performance:
  enable_streaming_processing: true
  enable_parallel_processing: true
  chunk_size: 200
  memory_limit_mb: 4096
  enable_adaptive_parameters: true

monitoring:
  progress_report_interval_seconds: 300
  enable_performance_metrics: true
```

## Configuration Schema Reference

For a complete reference of all configuration options, see the `SyncConfiguration` class in `scripts/config_system.py`.

## Support

For configuration issues or questions:

1. Check this documentation
2. Validate your configuration using the provided tools
3. Review the troubleshooting section
4. Check the logs for detailed error messages
5. Compare your configuration with the provided examples