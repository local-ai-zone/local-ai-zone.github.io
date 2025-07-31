import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ModelCard } from './ModelCard.js';

describe('ModelCard Component', () => {
  let modelCard;
  let container;
  let mockModel;

  beforeEach(() => {
    mockModel = {
      modelName: 'Test Model 7B Instruct',
      quantFormat: 'Q4_K_M',
      fileSize: 4500000000,
      fileSizeFormatted: '4.2 GB',
      modelType: 'Mistral',
      license: 'MIT',
      downloadCount: 1234,
      huggingFaceLink: 'https://huggingface.co/test/test-model-7b-instruct',
      directDownloadLink: 'https://huggingface.co/test/test-model-7b-instruct/resolve/main/test-model-7b-instruct.Q4_K_M.gguf',
      // Computed fields added by DataService
      id: 'Test Model 7B Instruct:test-model-7b-instruct.Q4_K_M.gguf',
      searchText: 'test model 7b instruct mistral q4_k_m test-model-7b-instruct.q4_k_m.gguf',
      tags: ['🔥 Popular', '🧠 7B']
    };

    modelCard = new ModelCard(mockModel, { lazyLoad: false });
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    modelCard.destroy();
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('render', () => {
    it('should create card element with correct structure', () => {
      const element = modelCard.render();
      
      expect(element.tagName).toBe('ARTICLE');
      expect(element.className).toContain('bg-white');
      expect(element.className).toContain('rounded-lg');
      expect(element.className).toContain('shadow-md');
    });

    it('should display model name', () => {
      const element = modelCard.render();
      const title = element.querySelector('h3');
      
      expect(title.textContent.trim()).toBe('Test Model 7B Instruct');
    });

    it('should display model type', () => {
      const element = modelCard.render();
      const content = element.innerHTML;
      
      expect(content).toContain('Mistral');
    });

    it('should display file size', () => {
      const element = modelCard.render();
      const content = element.innerHTML;
      
      expect(content).toContain('4.2 GB');
    });

    it('should display quantization type', () => {
      const element = modelCard.render();
      const content = element.innerHTML;
      
      expect(content).toContain('Q4_K_M');
    });

    it('should display model type when available', () => {
      const element = modelCard.render();
      const content = element.innerHTML;
      
      expect(content).toContain('Mistral');
    });

    it('should not display model type when unknown', () => {
      const modelWithUnknownType = { ...mockModel, modelType: 'Unknown' };
      const cardWithUnknownType = new ModelCard(modelWithUnknownType);
      const element = cardWithUnknownType.render();
      const content = element.innerHTML;
      
      expect(content).not.toContain('Unknown');
      cardWithUnknownType.destroy();
    });

    it('should display download count', () => {
      const element = modelCard.render();
      const content = element.innerHTML;
      
      expect(content).toContain('1,234 downloads');
    });

    it('should display last modified date', () => {
      const element = modelCard.render();
      const content = element.innerHTML;
      
      expect(content).toContain('Updated');
    });

    it('should have download button with correct link', () => {
      const element = modelCard.render();
      const downloadButton = element.querySelector(`a[href="${mockModel.directDownloadLink}"]`);
      
      expect(downloadButton).toBeTruthy();
      expect(downloadButton.textContent.trim()).toContain('Download');
      expect(downloadButton.getAttribute('target')).toBe('_blank');
      expect(downloadButton.getAttribute('rel')).toBe('noopener noreferrer');
    });
  });

  describe('tags', () => {
    it('should display tags when available', () => {
      const element = modelCard.render();
      const content = element.innerHTML;
      
      expect(content).toContain('🔥 Popular');
      expect(content).toContain('🧠 7B');
    });

    it('should handle model without tags', () => {
      const modelWithoutTags = { ...mockModel, tags: [] };
      const cardWithoutTags = new ModelCard(modelWithoutTags);
      const element = cardWithoutTags.render();
      
      // Should not crash and should not have tag elements
      expect(element).toBeTruthy();
      cardWithoutTags.destroy();
    });

    it('should apply correct styling for popular tags', () => {
      const element = modelCard.render();
      const content = element.innerHTML;
      
      expect(content).toContain('bg-red-100');
      expect(content).toContain('text-red-800');
    });

    it('should apply correct styling for size tags', () => {
      const element = modelCard.render();
      const content = element.innerHTML;
      
      expect(content).toContain('bg-purple-100');
      expect(content).toContain('text-purple-800');
    });
  });

  describe('description', () => {
    it('should display license when available', () => {
      const element = modelCard.render();
      const content = element.innerHTML;
      
      expect(content).toContain('MIT');
    });

    it('should not display license when not specified', () => {
      const modelWithoutLicense = { ...mockModel, license: 'Not specified' };
      const cardWithoutLicense = new ModelCard(modelWithoutLicense);
      const element = cardWithoutLicense.render();
      const content = element.innerHTML;
      
      expect(content).not.toContain('Not specified');
      cardWithoutLicense.destroy();
    });
  });

  describe('updateModel', () => {
    it('should update model data', () => {
      const updatedModel = { ...mockModel, modelName: 'Updated Model Name' };
      modelCard.updateModel(updatedModel);
      
      expect(modelCard.getModel().modelName).toBe('Updated Model Name');
    });
  });

  describe('date formatting', () => {
    it('should format recent dates correctly', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const modelWithYesterday = { 
        ...mockModel, 
        lastModified: yesterday.toISOString() 
      };
      const cardWithYesterday = new ModelCard(modelWithYesterday);
      
      // Test the date formatting function directly
      const formattedDate = cardWithYesterday._formatDate(yesterday.toISOString());
      expect(formattedDate).toBe('yesterday');
      
      cardWithYesterday.destroy();
    });

    it('should handle invalid dates gracefully', () => {
      const modelWithInvalidDate = { 
        ...mockModel, 
        lastModified: 'invalid-date' 
      };
      const cardWithInvalidDate = new ModelCard(modelWithInvalidDate);
      
      // Test the date formatting function directly
      const formattedDate = cardWithInvalidDate._formatDate('invalid-date');
      expect(formattedDate).toBe('recently');
      
      cardWithInvalidDate.destroy();
    });
  });

  describe('HTML escaping', () => {
    it('should escape HTML in model name', () => {
      const modelWithHtml = { 
        ...mockModel, 
        modelName: '<script>alert("xss")</script>Test Model' 
      };
      const cardWithHtml = new ModelCard(modelWithHtml);
      const element = cardWithHtml.render();
      
      // Check that the text content is properly displayed (browser handles this)
      const title = element.querySelector('h3');
      expect(title.textContent).toContain('<script>alert("xss")</script>Test Model');
      
      // Test the escaping functions directly
      expect(cardWithHtml._escapeHtml('<script>test</script>')).toBe('&lt;script&gt;test&lt;/script&gt;');
      expect(cardWithHtml._escapeAttribute('<script>test</script>')).toBe('&lt;script&gt;test&lt;/script&gt;');
      
      cardWithHtml.destroy();
    });

    it('should have proper URL handling', () => {
      const modelWithUrl = { 
        ...mockModel, 
        directDownloadLink: 'https://example.com/file.gguf' 
      };
      const cardWithUrl = new ModelCard(modelWithUrl);
      const element = cardWithUrl.render();
      
      const downloadButton = element.querySelector('a');
      expect(downloadButton.getAttribute('href')).toBe('https://example.com/file.gguf');
      
      cardWithUrl.destroy();
    });
  });

  describe('destroy', () => {
    it('should remove element from DOM', () => {
      const element = modelCard.render();
      container.appendChild(element);
      
      expect(container.contains(element)).toBe(true);
      
      modelCard.destroy();
      
      expect(container.contains(element)).toBe(false);
    });

    it('should clean up references', () => {
      modelCard.render();
      modelCard.destroy();
      
      expect(modelCard.element).toBe(null);
      expect(modelCard.model).toBe(null);
    });
  });
});