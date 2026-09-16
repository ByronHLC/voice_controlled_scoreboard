const DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

// 支援 0-99，賽事分數不會超過這個範圍
export function numToChinese(n) {
  if (n < 10) return DIGITS[n];
  if (n < 20) return '十' + (n % 10 === 0 ? '' : DIGITS[n % 10]);
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return DIGITS[tens] + '十' + (ones === 0 ? '' : DIGITS[ones]);
}
