import {
  getBlockIdFromMarkdown,
  getBlockReferenceFromMarkdown,
  stripBlockId,
  stripBlockReference,
  validateBlockId,
  BLOCK_ID_REGEX,
  BLOCK_REFERENCE_REGEX,
} from './blockref';

describe('Block ID and Reference Functions', () => {
  describe('getBlockIdFromMarkdown', () => {
    it('should extract block ID from markdown', () => {
      expect(getBlockIdFromMarkdown('Some text ^block-123')).toBe('^block-123');
      expect(getBlockIdFromMarkdown('No block ID')).toBeUndefined();
    });
  });

  describe('getBlockReferenceFromMarkdown', () => {
    it('should extract block reference from markdown', () => {
      expect(getBlockReferenceFromMarkdown('Some text #^block-123')).toBe('^block-123');
      expect(getBlockReferenceFromMarkdown('No block reference')).toBeUndefined();
    });
  });

  describe('stripBlockId', () => {
    it('should remove block ID from markdown', () => {
      expect(stripBlockId('Some text ^block-123')).toBe('Some text ');
      expect(stripBlockId('No block ID')).toBe('No block ID');
    });
  });

  describe('stripBlockReference', () => {
    it('should remove block reference from markdown', () => {
      expect(stripBlockReference('Some text #^block-123')).toBe('Some text ');
      expect(stripBlockReference('No block reference')).toBe('No block reference');
    });
  });

  describe('validateBlockId', () => {
    it('should validate block ID format', () => {
      expect(validateBlockId('^block-123')).toBe(true);
      expect(validateBlockId('invalid')).toBe(false);
    });
  });

  describe('BLOCK_ID_REGEX', () => {
    it('should match valid block IDs', () => {
      expect(BLOCK_ID_REGEX.test('^block-123')).toBe(true);
      expect(BLOCK_ID_REGEX.test('^123')).toBe(true);
      expect(BLOCK_ID_REGEX.test('invalid')).toBe(false);
    });
  });

  describe('BLOCK_REFERENCE_REGEX', () => {
    it('should match valid block references', () => {
      expect(BLOCK_REFERENCE_REGEX.test('#^block-123')).toBe(true);
      expect(BLOCK_REFERENCE_REGEX.test('#^123')).toBe(true);
      expect(BLOCK_REFERENCE_REGEX.test('invalid')).toBe(false);
    });
  });
});