import { formatCurrency, formatTime } from './formatters';

describe('Formatters Utilities - Unit Tests (AAA Pattern)', () => {
  
  describe('formatCurrency', () => {
    
    test('should format number to AR currency format with symbol', () => {
      // 1. Arrange
      const amount = 2500;
      const includeSymbol = true;

      // 2. Act
      const result = formatCurrency(amount, includeSymbol);

      // 3. Assert
      expect(result).toBe('$2.500');
    });

    test('should format number to AR currency format without symbol', () => {
      // 1. Arrange
      const amount = 10500;
      const includeSymbol = false;

      // 2. Act
      const result = formatCurrency(amount, includeSymbol);

      // 3. Assert
      expect(result).toBe('10.500');
    });

    test('should return default value when amount is invalid', () => {
      // 1. Arrange
      const invalidAmount = 'not-a-number';
      const includeSymbol = true;

      // 2. Act
      const result = formatCurrency(invalidAmount, includeSymbol);

      // 3. Assert
      expect(result).toBe('$0');
    });

    test('should return default value without symbol when amount is invalid and symbol excluded', () => {
      // 1. Arrange
      const invalidAmount = 'not-a-number';
      const includeSymbol = false;

      // 2. Act
      const result = formatCurrency(invalidAmount, includeSymbol);

      // 3. Assert
      expect(result).toBe('0');
    });

    test('should format valid string number to AR currency format', () => {
      // 1. Arrange
      const amountString = '1500';
      const includeSymbol = true;

      // 2. Act
      const result = formatCurrency(amountString, includeSymbol);

      // 3. Assert
      expect(result).toBe('$1.500');
    });
    
  });

  describe('formatTime', () => {

    test('should format Date object to HH:MM format', () => {
      // 1. Arrange
      const date = new Date('2026-05-31T14:30:00Z');
      // Adjusting to Argentine/GMT-3 time zone for validation
      // 14:30 UTC = 11:30 GMT-3
      const expectedTime = '11:30';

      // 2. Act
      const result = formatTime(date);

      // 3. Assert
      expect(result).toBe(expectedTime);
    });

    test('should format ISO string date to HH:MM format', () => {
      // 1. Arrange
      const dateString = '2026-05-31T18:45:00Z';
      // 18:45 UTC = 15:45 GMT-3
      const expectedTime = '15:45';

      // 2. Act
      const result = formatTime(dateString);

      // 3. Assert
      expect(result).toBe(expectedTime);
    });

  });

});
