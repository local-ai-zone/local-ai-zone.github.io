# Requirements Document

## Introduction

This feature addresses critical SEO issues in the current sitemap.xml generation workflow. The current system generates duplicate and non-SEO-friendly URLs, while missing important content directories. Search engines cannot properly index hash-based URLs like `https://local-ai-zone.github.io/#model=glm-4-5-air`, and the sitemap is missing valuable content from guides, CPU recommendations, and brand information pages.

## Requirements

### Requirement 1

**User Story:** As a search engine crawler, I want to access only proper HTML pages without hash fragments, so that I can properly index the website content.

#### Acceptance Criteria

1. WHEN the sitemap is generated THEN it SHALL exclude all hash-based URLs (URLs containing '#')
2. WHEN a model has both hash and HTML page versions THEN the sitemap SHALL only include the HTML page version
3. WHEN the sitemap is validated THEN it SHALL contain zero URLs with hash fragments
4. WHEN search engines crawl the sitemap THEN they SHALL find only indexable URLs

### Requirement 2

**User Story:** As a website owner, I want all valuable content directories included in the sitemap, so that search engines can discover and index all my content.

#### Acceptance Criteria

1. WHEN the sitemap is generated THEN it SHALL include all HTML files from the guides/ directory
2. WHEN the sitemap is generated THEN it SHALL include all HTML files from the cpu/ directory  
3. WHEN the sitemap is generated THEN it SHALL include all HTML files from the brands/ directory
4. WHEN new HTML files are added to these directories THEN they SHALL be automatically included in future sitemap generations
5. WHEN the sitemap is generated THEN it SHALL maintain proper priority and changefreq values for different content types

### Requirement 3

**User Story:** As a developer, I want the sitemap generation to be automated and maintainable, so that I don't have to manually update it when content changes.

#### Acceptance Criteria

1. WHEN the sitemap generation script runs THEN it SHALL automatically scan all relevant directories
2. WHEN duplicate URLs are detected THEN the system SHALL automatically resolve them by preferring HTML pages over hash URLs
3. WHEN the script encounters errors THEN it SHALL provide clear error messages and continue processing other URLs
4. WHEN the sitemap is generated THEN it SHALL be validated against XML sitemap standards
5. WHEN the generation is complete THEN it SHALL provide a summary of included/excluded URLs

### Requirement 4

**User Story:** As an SEO specialist, I want proper URL prioritization and metadata in the sitemap, so that search engines understand the relative importance of different pages.

#### Acceptance Criteria

1. WHEN the sitemap includes the homepage THEN it SHALL have priority 1.0 and changefreq "daily"
2. WHEN the sitemap includes model pages THEN they SHALL have priority 0.8 and changefreq "weekly"
3. WHEN the sitemap includes guide pages THEN they SHALL have priority 0.7 and changefreq "monthly"
4. WHEN the sitemap includes CPU/brand pages THEN they SHALL have priority 0.6 and changefreq "monthly"
5. WHEN the sitemap includes other pages THEN they SHALL have appropriate priority values between 0.5-0.9

### Requirement 5

**User Story:** As a website administrator, I want the sitemap to be optimized for search engine guidelines, so that it maximizes SEO effectiveness.

#### Acceptance Criteria

1. WHEN the sitemap is generated THEN it SHALL contain no more than 50,000 URLs per sitemap file
2. WHEN the sitemap exceeds URL limits THEN it SHALL be split into multiple sitemap files with a sitemap index
3. WHEN URLs are included THEN they SHALL all return HTTP 200 status codes
4. WHEN the sitemap is generated THEN it SHALL include proper XML encoding and namespace declarations
5. WHEN lastmod dates are included THEN they SHALL be in proper ISO 8601 format