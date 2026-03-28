import { describe, it, expect } from 'vitest';
import { postProcessTranscription } from '../../src/renderer/src/voice/voice-postprocessor';

describe('postProcessTranscription', () => {
  describe('symbol replacement', () => {
    it('converts "forward slash" to /', () => {
      const result = postProcessTranscription('forward slash help');
      expect(result).toContain('/');
      expect(result).toContain('help');
    });

    it('converts "dot" to .', () => {
      const result = postProcessTranscription('console dot log');
      expect(result).toBe('console.log');
    });

    it('converts "underscore" to _', () => {
      const result = postProcessTranscription('my underscore variable');
      expect(result).toBe('my_variable');
    });

    it('converts "equals" to =', () => {
      const result = postProcessTranscription('x equals 5');
      expect(result).toContain('=');
      expect(result).toContain('x');
      expect(result).toContain('5');
    });

    it('converts consecutive dashes', () => {
      const result = postProcessTranscription('dash dash save');
      expect(result).toContain('--');
      expect(result).toContain('save');
    });
  });

  describe('snake_case conversion', () => {
    it('converts "snake case get user id by name"', () => {
      expect(postProcessTranscription('snake case get user id by name')).toBe('get_user_id_by_name');
    });

    it('converts "snake case my variable"', () => {
      expect(postProcessTranscription('snake case my variable')).toBe('my_variable');
    });
  });

  describe('camelCase conversion', () => {
    it('converts "camel case get user name"', () => {
      expect(postProcessTranscription('camel case get user name')).toBe('getUserName');
    });

    it('converts "camel case is valid"', () => {
      expect(postProcessTranscription('camel case is valid')).toBe('isValid');
    });
  });

  describe('PascalCase conversion', () => {
    it('converts "pascal case user service"', () => {
      expect(postProcessTranscription('pascal case user service')).toBe('UserService');
    });
  });

  describe('kebab-case conversion', () => {
    it('converts "kebab case my component"', () => {
      expect(postProcessTranscription('kebab case my component')).toBe('my-component');
    });
  });

  describe('natural mode', () => {
    it('does not transform in natural mode', () => {
      expect(postProcessTranscription('forward slash help', 'natural')).toBe('forward slash help');
    });

    it('preserves original text', () => {
      expect(postProcessTranscription('snake case my var', 'natural')).toBe('snake case my var');
    });
  });

  describe('forward slash commands', () => {
    it('converts "forward slash commit" to contain /commit', () => {
      const result = postProcessTranscription('forward slash commit');
      expect(result).toContain('/commit');
    });

    it('converts "forward slash help" to contain /help', () => {
      const result = postProcessTranscription('forward slash help');
      expect(result).toContain('/help');
    });
  });

  describe('combined usage', () => {
    it('handles dot-separated names', () => {
      expect(postProcessTranscription('process dot env')).toBe('process.env');
    });

    it('handles path-like expressions', () => {
      const result = postProcessTranscription('forward slash home forward slash user');
      expect(result).toContain('/home');
      expect(result).toContain('/user');
    });
  });
});
