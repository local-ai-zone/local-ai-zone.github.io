# Design Document

## Overview

This design outlines the optimization of GitHub Actions workflow scheduling to prevent resource conflicts and ensure proper execution sequencing. The solution involves updating cron expressions in workflow files while preserving existing trigger mechanisms and dependencies.

## Architecture

### Current Workflow Schedule
- `daily-update.yml`: 2:00 AM UTC (`0 2 * * *`)
- `seo-optimization.yml`: 3:00 AM UTC (`0 3 * * *`) 
- `prerender-models.yml`: 4:00 AM UTC (`0 4 * * *`)
- `sync-docs-to-wiki.yml`: No scheduled trigger (push-based only)

### Target Workflow Schedule
- `daily-update.yml`: 23:59 UTC (`59 23 * * *`)
- `seo-optimization.yml`: 5:00 AM UTC (`0 5 * * *`)
- `prerender-models.yml`: 4:00 AM UTC (`0 4 * * *`) - No change
- `sync-docs-to-wiki.yml`: No scheduled trigger (remains push-based only)

## Components and Interfaces

### Workflow Files to Modify

#### 1. daily-update.yml
- **Current Schedule**: `0 2 * * *` (2:00 AM UTC)
- **New Schedule**: `59 23 * * *` (23:59 UTC)
- **Rationale**: Moving to end of day ensures fresh data collection before other workflows

#### 2. seo-optimization.yml  
- **Current Schedule**: `0 3 * * *` (3:00 AM UTC)
- **New Schedule**: `0 5 * * *` (5:00 AM UTC)
- **Rationale**: Runs after prerender-models to optimize SEO for newly generated pages

#### 3. prerender-models.yml
- **Current Schedule**: `0 4 * * *` (4:00 AM UTC) 
- **New Schedule**: No change (remains at 4:00 AM UTC)
- **Rationale**: Optimal timing between data update and SEO optimization

#### 4. sync-docs-to-wiki.yml
- **Current Schedule**: No scheduled trigger
- **New Schedule**: No scheduled trigger (remains push-based)
- **Rationale**: Avoids 12:00 PM UTC as requested, maintains event-driven approach

### Trigger Preservation Strategy

#### Schedule Triggers
- Update cron expressions while maintaining YAML structure
- Preserve comments explaining timing rationale
- Keep timezone as UTC for consistency

#### Workflow Dependencies
- Maintain `workflow_run` triggers for dependent workflows
- Preserve success/failure conditions
- Keep dependency chain: daily-update → seo-optimization → prerender-models

#### Manual Triggers
- Retain `workflow_dispatch` triggers on all workflows
- Preserve manual trigger parameters if any exist
- Maintain bypass logic for scheduled constraints

## Data Models

### Cron Expression Format
```yaml
schedule:
  - cron: 'MM HH DD MM DOW'
```

Where:
- MM: Minutes (0-59)
- HH: Hours (0-23, UTC)
- DD: Day of month (1-31)
- MM: Month (1-12)
- DOW: Day of week (0-7, Sunday = 0 or 7)

### Workflow Trigger Configuration
```yaml
on:
  schedule:
    - cron: 'expression'
  workflow_dispatch: # Manual trigger
  workflow_run: # Dependency trigger
    workflows: ["Dependency Workflow Name"]
    types: [completed]
```

## Error Handling

### Schedule Validation
- Verify cron expressions are valid before committing
- Test that new schedules don't conflict with GitHub Actions limits
- Ensure UTC timezone is maintained across all workflows

### Dependency Chain Integrity
- Validate that workflow_run dependencies still reference correct workflow names
- Ensure success conditions are preserved
- Test that manual triggers bypass scheduling constraints

### Rollback Strategy
- Keep backup of original workflow files
- Document original cron expressions in comments
- Provide quick rollback procedure if issues arise

## Testing Strategy

### Pre-deployment Testing
1. **Syntax Validation**: Validate YAML syntax and cron expressions
2. **Dependency Testing**: Verify workflow_run triggers reference correct workflows
3. **Manual Trigger Testing**: Test workflow_dispatch functionality

### Post-deployment Monitoring
1. **Schedule Verification**: Confirm workflows run at expected times
2. **Dependency Chain Testing**: Verify dependent workflows trigger correctly
3. **Resource Monitoring**: Check for reduced resource conflicts

### Test Scenarios
- Manual trigger of each workflow
- Successful completion chain: daily-update → seo-optimization → prerender-models
- Failure handling: verify dependent workflows don't run when prerequisites fail
- Rate limiting: confirm sync-docs-to-wiki maintains 1-hour cooldown

## Implementation Approach

### Phase 1: Update Cron Expressions
- Modify daily-update.yml to run at 23:59 UTC
- Update seo-optimization.yml to run at 5:00 AM UTC
- Leave prerender-models.yml unchanged at 4:00 AM UTC
- Confirm sync-docs-to-wiki.yml has no scheduled trigger

### Phase 2: Validation and Testing
- Validate all YAML syntax
- Test manual triggers for each workflow
- Verify dependency chains remain intact
- Document new schedule in workflow comments

### Phase 3: Monitoring and Optimization
- Monitor first few scheduled runs
- Check for resource conflicts or timing issues
- Adjust if any workflows show timing-related problems
- Update documentation with new schedule information