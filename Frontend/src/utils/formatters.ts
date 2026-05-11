/**
 * Utilidades para formatear datos en la aplicación
 */

/**
 * Formatea un número como moneda (Pesos)
 * Ejemplo: 2000 -> $2.000
 * @param amount El monto a formatear
 * @param includeSymbol Si debe incluir el signo $ (default: true)
 */
export const formatCurrency = (amount: number | string, includeSymbol: boolean = true): string => {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(value)) return includeSymbol ? '$0' : '0';

  const formatted = new Intl.NumberFormat('es-AR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

  return includeSymbol ? `$${formatted}` : formatted;
};

/**
 * Formatea una fecha para mostrar solo la hora
 * @param date Objeto Date o string de fecha
 */
export const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};
