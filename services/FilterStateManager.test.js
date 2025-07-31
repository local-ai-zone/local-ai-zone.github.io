import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FilterStateManager } from './FilterStateManager.js';

describe('FilterStateManager', () => {
  let filterStateManager;

  beforeEach(() => {
    filterStateManager = new FilterStateManager();
  });

  afterEach(() => {
    filterStateManager.destroy();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const state = filterStateManager.getCurrentState();
      expect(state).toEqual({
        quantizations: [],
        architectures: [],
        families: [],
        sizeRanges: [],
        searchQuery: ''
      });
    });

    it('should provide default filter state', () => {
      const defaultState = filterStateManager.getDefaultFilterState();
      expect(defaultState).toEqual({
        quantizations: [],
        architectures: [],
        families: [],
        sizeRanges: [],
        searchQuery: ''
      });
    });
  });

  describe('state updates', () => {
    it('should update state with valid updates', () => {
      const updates = {
        quantizations: ['Q4_K_M'],
        searchQuery: 'test'
      };

      filterStateManager.updateState(updates, false);
      const state = filterStateManager.getCurrentState();

      expect(state.quantizations).toEqual(['Q4_K_M']);
      expect(state.searchQuery).toBe('test');
      expect(state.architectures).toEqual([]); // unchanged
    });

    it('should reject invalid updates', () => {
      const invalidUpdates = {
        quantizations: 'not-an-array',
        searchQuery: 123
      };

      const originalState = filterStateManager.getCurrentState();
      filterStateManager.updateState(invalidUpdates, false);
      const newState = filterStateManager.getCurrentState();

      expect(newState).toEqual(originalState);
    });

    it('should not update URL when updateUrl is false', () => {
      const updates = {
        quantizations: ['Q4_K_M']
      };

      // Should not throw error even without proper browser environment
      expect(() => {
        filterStateManager.updateState(updates, false);
      }).not.toThrow();
    });
  });

  describe('state reset', () => {
    it('should reset state to default values', () => {
      // First set some values
      filterStateManager.updateState({
        quantizations: ['Q4_K_M'],
        searchQuery: 'test'
      }, false);

      // Then reset
      filterStateManager.resetState(false);
      const state = filterStateManager.getCurrentState();

      expect(state).toEqual(filterStateManager.getDefaultFilterState());
    });

    it('should reset without errors', () => {
      expect(() => {
        filterStateManager.resetState(false);
      }).not.toThrow();
    });
  });

  describe('filter value management', () => {
    it('should add filter value', () => {
      filterStateManager.addFilterValue('quantizations', 'Q4_K_M', false);
      const state = filterStateManager.getCurrentState();
      expect(state.quantizations).toContain('Q4_K_M');
    });

    it('should not add duplicate filter value', () => {
      filterStateManager.addFilterValue('quantizations', 'Q4_K_M', false);
      filterStateManager.addFilterValue('quantizations', 'Q4_K_M', false);
      const state = filterStateManager.getCurrentState();
      expect(state.quantizations).toEqual(['Q4_K_M']);
    });

    it('should remove filter value', () => {
      filterStateManager.addFilterValue('quantizations', 'Q4_K_M', false);
      filterStateManager.addFilterValue('quantizations', 'Q8_0', false);
      filterStateManager.removeFilterValue('quantizations', 'Q4_K_M', false);
      
      const state = filterStateManager.getCurrentState();
      expect(state.quantizations).toEqual(['Q8_0']);
    });

    it('should toggle filter value', () => {
      // Toggle on
      filterStateManager.toggleFilterValue('quantizations', 'Q4_K_M', false);
      let state = filterStateManager.getCurrentState();
      expect(state.quantizations).toContain('Q4_K_M');

      // Toggle off
      filterStateManager.toggleFilterValue('quantizations', 'Q4_K_M', false);
      state = filterStateManager.getCurrentState();
      expect(state.quantizations).not.toContain('Q4_K_M');
    });

    it('should handle invalid category for filter operations', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      filterStateManager.addFilterValue('searchQuery', 'value', false);
      expect(consoleSpy).toHaveBeenCalledWith('Cannot add value to non-array filter category: searchQuery');
      
      consoleSpy.mockRestore();
    });
  });

  describe('clear filters', () => {
    it('should clear specific filter categories', () => {
      // Set some values
      filterStateManager.updateState({
        quantizations: ['Q4_K_M'],
        architectures: ['Mistral'],
        searchQuery: 'test'
      }, false);

      // Clear specific categories
      filterStateManager.clearFilters(['quantizations', 'searchQuery'], false);
      const state = filterStateManager.getCurrentState();

      expect(state.quantizations).toEqual([]);
      expect(state.searchQuery).toBe('');
      expect(state.architectures).toEqual(['Mistral']); // unchanged
    });
  });

  describe('URL persistence', () => {
    it('should handle URL operations gracefully without browser environment', () => {
      expect(() => {
        filterStateManager.loadStateFromUrl();
      }).not.toThrow();

      expect(() => {
        filterStateManager.updateUrlFromState();
      }).not.toThrow();
    });
  });

  describe('active filters detection', () => {
    it('should detect when no filters are active', () => {
      expect(filterStateManager.hasActiveFilters()).toBe(false);
      expect(filterStateManager.getActiveFilterCount()).toBe(0);
    });

    it('should detect active array filters', () => {
      filterStateManager.updateState({
        quantizations: ['Q4_K_M'],
        architectures: ['Mistral', 'Llama']
      }, false);

      expect(filterStateManager.hasActiveFilters()).toBe(true);
      expect(filterStateManager.getActiveFilterCount()).toBe(3);
    });

    it('should detect active search query', () => {
      filterStateManager.updateState({
        searchQuery: 'test'
      }, false);

      expect(filterStateManager.hasActiveFilters()).toBe(true);
      expect(filterStateManager.getActiveFilterCount()).toBe(1);
    });

    it('should ignore empty search query', () => {
      filterStateManager.updateState({
        searchQuery: '   '
      }, false);

      expect(filterStateManager.hasActiveFilters()).toBe(false);
      expect(filterStateManager.getActiveFilterCount()).toBe(0);
    });
  });

  describe('listeners', () => {
    it('should add and notify listeners', () => {
      const listener = vi.fn();
      filterStateManager.addListener(listener);

      const updates = { quantizations: ['Q4_K_M'] };
      filterStateManager.updateState(updates, false);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ quantizations: ['Q4_K_M'] }),
        expect.objectContaining({ quantizations: [] })
      );
    });

    it('should remove listeners', () => {
      const listener = vi.fn();
      filterStateManager.addListener(listener);
      filterStateManager.removeListener(listener);

      filterStateManager.updateState({ quantizations: ['Q4_K_M'] }, false);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      filterStateManager.addListener(errorListener);
      filterStateManager.updateState({ quantizations: ['Q4_K_M'] }, false);

      expect(consoleSpy).toHaveBeenCalledWith('Error in filter state listener:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should ignore non-function listeners', () => {
      filterStateManager.addListener('not-a-function');
      filterStateManager.addListener(null);
      filterStateManager.addListener(undefined);

      // Should not throw errors
      filterStateManager.updateState({ quantizations: ['Q4_K_M'] }, false);
    });
  });

  describe('validation', () => {
    it('should validate correct filter state', () => {
      const validState = {
        quantizations: ['Q4_K_M'],
        architectures: ['Mistral'],
        families: ['meta-llama'],
        sizeRanges: ['1-4GB'],
        searchQuery: 'test'
      };

      expect(filterStateManager.validateFilterState(validState)).toBe(true);
    });

    it('should reject invalid filter state', () => {
      const invalidStates = [
        null,
        undefined,
        'not-an-object',
        { quantizations: 'not-an-array' },
        { searchQuery: 123 },
        { quantizations: [123] }, // non-string array items
        { missingFields: true } // missing required fields
      ];

      invalidStates.forEach(state => {
        expect(filterStateManager.validateFilterState(state)).toBe(false);
      });
    });

    it('should validate state updates', () => {
      const validUpdates = {
        quantizations: ['Q4_K_M'],
        searchQuery: 'test'
      };

      const invalidUpdates = [
        null,
        'not-an-object',
        { quantizations: 'not-an-array' },
        { searchQuery: 123 },
        { unknownField: 'value' }
      ];

      expect(filterStateManager.validateStateUpdates(validUpdates)).toBe(true);
      
      invalidUpdates.forEach(updates => {
        expect(filterStateManager.validateStateUpdates(updates)).toBe(false);
      });
    });
  });

  describe('initialization and cleanup', () => {
    it('should initialize without errors', () => {
      expect(() => {
        filterStateManager.initialize();
      }).not.toThrow();
    });

    it('should cleanup listeners on destroy', () => {
      const listener = vi.fn();
      filterStateManager.addListener(listener);
      
      filterStateManager.destroy();
      filterStateManager.updateState({ quantizations: ['Q4_K_M'] }, false);
      
      expect(listener).not.toHaveBeenCalled();
    });
  });
});