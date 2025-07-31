import { describe, it, expect } from 'vitest';
import { 
  parseFilename, 
  generateTags, 
  isValidGGUFFilename,
  extractModelVersion
} from './parsers.js';

describe('parseFilename', () => {
  it('should parse quantization types correctly', () => {
    expect(parseFilename('model.Q4_K_M.gguf')).toMatchObject({
      quantization: 'Q4_K_M',
      isValid: true
    });
    
    expect(parseFilename('model.Q8_0.gguf')).toMatchObject({
      quantization: 'Q8_0',
      isValid: true
    });
    
    expect(parseFilename('model.f32.gguf')).toMatchObject({
      quantization: 'f32',
      isValid: true
    });
    
    expect(parseFilename('model.BF16.gguf')).toMatchObject({
      quantization: 'BF16',
      isValid: true
    });
  });

  it('should extract model sizes correctly', () => {
    expect(parseFilename('Mistral-7B-Instruct.Q4_K_M.gguf')).toMatchObject({
      modelSize: 7,
      architecture: 'Mistral'
    });
    
    expect(parseFilename('Llama-13B-Chat.Q8_0.gguf')).toMatchObject({
      modelSize: 13,
      architecture: 'Llama'
    });
    
    expect(parseFilename('Model-1.5B.Q4_0.gguf')).toMatchObject({
      modelSize: 1.5
    });
  });

  it('should detect architectures from filenames', () => {
    expect(parseFilename('Mistral-7B.Q4_K_M.gguf')).toMatchObject({
      architecture: 'Mistral'
    });
    
    expect(parseFilename('Llama2-13B.Q8_0.gguf')).toMatchObject({
      architecture: 'Llama2'
    });
    
    expect(parseFilename('Qwen-14B.Q4_0.gguf')).toMatchObject({
      architecture: 'Qwen'
    });
    
    expect(parseFilename('Phi3-Mini.Q4_K_M.gguf')).toMatchObject({
      architecture: 'Phi3'
    });
  });

  it('should handle invalid inputs gracefully', () => {
    expect(parseFilename('')).toMatchObject({
      quantization: 'Unknown',
      architecture: 'Unknown',
      modelSize: null,
      isValid: false
    });
    
    expect(parseFilename(null)).toMatchObject({
      quantization: 'Unknown',
      architecture: 'Unknown',
      isValid: false
    });
    
    expect(parseFilename('not-a-gguf-file.txt')).toMatchObject({
      quantization: 'Unknown',
      isValid: false
    });
  });
});


describe('generateTags', () => {
  it('should generate popularity tags based on downloads', () => {
    const popularModel = { downloads: 1500 };
    const trendingModel = { downloads: 500 };
    const newModel = { downloads: 50 };
    
    expect(generateTags(popularModel, {}, 0)).toContain('🔥 Popular');
    expect(generateTags(trendingModel, {}, 0)).toContain('⭐ Trending');
    expect(generateTags(newModel, {}, 0)).not.toContain('🔥 Popular');
    expect(generateTags(newModel, {}, 0)).not.toContain('⭐ Trending');
  });

  it('should generate size tags based on file size', () => {
    const smallModel = generateTags({}, {}, 500 * 1024 * 1024); // 500MB
    const mediumModel = generateTags({}, {}, 7 * 1024 * 1024 * 1024); // 7GB
    const largeModel = generateTags({}, {}, 70 * 1024 * 1024 * 1024); // 70GB
    
    expect(smallModel).toContain('🧠 <1B');
    expect(mediumModel).toContain('🧠 7B');
    expect(largeModel).toContain('🧠 70B');
  });

  it('should generate architecture tags', () => {
    const metadata = { architecture: 'Mistral' };
    const tags = generateTags({}, metadata, 0);
    
    expect(tags).toContain('🏗️ Mistral');
  });

  it('should generate quantization quality tags', () => {
    expect(generateTags({}, { quantization: 'f32' }, 0)).toContain('💎 Full Precision');
    expect(generateTags({}, { quantization: 'Q8_0' }, 0)).toContain('⚡ High Quality');
    expect(generateTags({}, { quantization: 'Q4_K_M' }, 0)).toContain('🚀 Balanced');
    expect(generateTags({}, { quantization: 'Q2_K' }, 0)).toContain('📦 Compact');
  });

  it('should limit tags to reasonable number', () => {
    const model = { downloads: 2000 };
    const metadata = { 
      architecture: 'Mistral', 
      quantization: 'Q4_K_M',
      modelSize: 7
    };
    const sizeBytes = 7 * 1024 * 1024 * 1024;
    
    const tags = generateTags(model, metadata, sizeBytes);
    expect(tags.length).toBeLessThanOrEqual(4);
  });
});

describe('isValidGGUFFilename', () => {
  it('should validate correct GGUF filenames', () => {
    expect(isValidGGUFFilename('model.Q4_K_M.gguf')).toBe(true);
    expect(isValidGGUFFilename('Mistral-7B-Instruct.Q8_0.gguf')).toBe(true);
    expect(isValidGGUFFilename('complex-model-name.f32.gguf')).toBe(true);
  });

  it('should reject invalid filenames', () => {
    expect(isValidGGUFFilename('')).toBe(false);
    expect(isValidGGUFFilename('model.txt')).toBe(false);
    expect(isValidGGUFFilename('model.gguf.backup')).toBe(false);
    expect(isValidGGUFFilename('model<test>.gguf')).toBe(false);
    expect(isValidGGUFFilename('model..gguf')).toBe(false);
    expect(isValidGGUFFilename(null)).toBe(false);
  });
});

describe('extractModelVersion', () => {
  it('should extract version numbers from text', () => {
    expect(extractModelVersion('model-v1.5-instruct')).toBe('1.5');
    expect(extractModelVersion('Mistral-7B-Instruct-v0.2')).toBe('0.2');
    expect(extractModelVersion('model-version-2.1')).toBe('2.1');
    expect(extractModelVersion('instruct-v3')).toBe('3');
  });

  it('should return null for text without versions', () => {
    expect(extractModelVersion('simple-model-name')).toBe(null);
    expect(extractModelVersion('')).toBe(null);
    expect(extractModelVersion(null)).toBe(null);
  });
});