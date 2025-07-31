/**
 * Tests for SEO Manager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SEOManager } from './seoManager.js';

// Mock DOM environment
const mockDocument = {
    title: '',
    head: {
        appendChild: vi.fn()
    },
    querySelector: vi.fn(),
    createElement: vi.fn(() => ({
        setAttribute: vi.fn(),
        rel: '',
        property: '',
        name: '',
        id: '',
        type: '',
        textContent: ''
    }))
};

const mockWindow = {
    location: {
        origin: 'https://test.github.io'
    }
};

// Setup global mocks
global.document = mockDocument;
global.window = mockWindow;

describe('SEOManager', () => {
    let seoManager;
    let mockModel;

    beforeEach(() => {
        seoManager = new SEOManager();
        mockModel = {
            id: 'microsoft/DialoGPT-medium',
            name: 'DialoGPT Medium',
            description: 'A conversational AI model',
            family: 'microsoft',
            architecture: 'GPT',
            downloads: 15420,
            totalSize: 2147483648,
            lastModified: '2025-01-15T10:30:00Z',
            tags: ['conversational', 'medium', '4bit'],
            quantizations: ['Q4_K_M', 'Q8_0'],
            files: [
                {
                    filename: 'DialoGPT-medium.Q4_K_M.gguf',
                    downloadUrl: 'https://huggingface.co/microsoft/DialoGPT-medium/resolve/main/DialoGPT-medium.Q4_K_M.gguf',
                    sizeBytes: 1073741824
                }
            ]
        };

        // Reset mocks
        vi.clearAllMocks();
    });

    describe('generateModelStructuredData', () => {
        it('should generate valid structured data for a model', () => {
            const structuredData = seoManager.generateModelStructuredData(mockModel);

            expect(structuredData['@context']).toBe('https://schema.org');
            expect(structuredData['@type']).toBe('SoftwareApplication');
            expect(structuredData.name).toBe('DialoGPT Medium');
            expect(structuredData.description).toBe('A conversational AI model');
            expect(structuredData.author.name).toBe('microsoft');
            expect(structuredData.keywords).toContain('GGUF');
            expect(structuredData.keywords).toContain('GPT');
            expect(structuredData.keywords).toContain('conversational');
        });

        it('should handle models with minimal data', () => {
            const minimalModel = {
                id: 'test/model',
                name: 'Test Model'
            };

            const structuredData = seoManager.generateModelStructuredData(minimalModel);

            expect(structuredData.name).toBe('Test Model');
            expect(structuredData.description).toBe('GGUF quantized AI model: Test Model');
            expect(structuredData.keywords).toContain('GGUF');
        });
    });

    describe('generateBreadcrumbStructuredData', () => {
        it('should generate valid breadcrumb structured data', () => {
            const breadcrumbs = [
                { name: 'Home', url: '/' },
                { name: 'Models', url: '/models' },
                { name: 'DialoGPT Medium' }
            ];

            const structuredData = seoManager.generateBreadcrumbStructuredData(breadcrumbs);

            expect(structuredData['@type']).toBe('BreadcrumbList');
            expect(structuredData.itemListElement).toHaveLength(3);
            expect(structuredData.itemListElement[0].position).toBe(1);
            expect(structuredData.itemListElement[0].name).toBe('Home');
            expect(structuredData.itemListElement[2].name).toBe('DialoGPT Medium');
        });
    });

    describe('generateSearchResultsStructuredData', () => {
        it('should generate valid search results structured data', () => {
            const query = 'GPT models';
            const results = [mockModel];
            const totalCount = 1;

            const structuredData = seoManager.generateSearchResultsStructuredData(query, results, totalCount);

            expect(structuredData['@type']).toBe('SearchResultsPage');
            expect(structuredData.name).toBe('Search Results for "GPT models"');
            expect(structuredData.mainEntity.numberOfItems).toBe(1);
            expect(structuredData.mainEntity.itemListElement[0].item.name).toBe('DialoGPT Medium');
        });
    });

    describe('createModelSlug', () => {
        it('should create valid URL slugs from model IDs', () => {
            expect(seoManager.createModelSlug('microsoft/DialoGPT-medium')).toBe('microsoft--dialogpt-medium');
            expect(seoManager.createModelSlug('meta-llama/Llama-2-7b-chat-hf')).toBe('meta-llama--llama-2-7b-chat-hf');
            expect(seoManager.createModelSlug('test/model_with_underscores')).toBe('test--model-with-underscores');
        });
    });

    describe('generateModelPageMeta', () => {
        it('should generate appropriate meta tags for model page', () => {
            const meta = seoManager.generateModelPageMeta(mockModel);

            expect(meta.title).toBe('DialoGPT Medium - GGUF Model');
            expect(meta.description).toContain('DialoGPT Medium GGUF quantized AI model');
            expect(meta.description).toContain('15420 downloads');
            expect(meta.keywords).toContain('DialoGPT Medium');
            expect(meta.keywords).toContain('GGUF model');
            expect(meta.keywords).toContain('GPT');
            expect(meta.url).toBe('/model/microsoft--dialogpt-medium');
            expect(meta.type).toBe('article');
        });
    });

    describe('generateSearchPageMeta', () => {
        it('should generate meta tags for search with query', () => {
            const meta = seoManager.generateSearchPageMeta('GPT models', 42);

            expect(meta.title).toBe('Search Results for "GPT models" - 42 GGUF Models Found');
            expect(meta.description).toContain('Found 42 GGUF AI models matching "GPT models"');
            expect(meta.keywords).toContain('GPT models');
            expect(meta.url).toBe('/search?q=GPT%20models');
        });

        it('should generate meta tags for search without query', () => {
            const meta = seoManager.generateSearchPageMeta('', 0);

            expect(meta.title).toBe('Search GGUF Models - AI Model Discovery');
            expect(meta.description).toContain('Search through thousands of GGUF quantized AI models');
            expect(meta.url).toBe('/search');
        });
    });

    describe('generateFamilyPageMeta', () => {
        it('should generate meta tags for family page', () => {
            const meta = seoManager.generateFamilyPageMeta('microsoft', 25);

            expect(meta.title).toBe('microsoft Models - 25 GGUF Models Available');
            expect(meta.description).toContain('Browse 25 GGUF quantized AI models from microsoft');
            expect(meta.keywords).toContain('microsoft models');
            expect(meta.url).toBe('/family/microsoft');
        });
    });
});