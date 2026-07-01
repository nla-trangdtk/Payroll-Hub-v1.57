// Robust VN number formatter — does NOT depend on browser locale
export function formatVNRobust(num: number, decimals: number = 0): string {
  if (isNaN(num)) return "0";

  // Using Intl.NumberFormat with 'vi-VN' locale ensures:
  // - Thousands separator is '.'
  // - Decimal separator is ','
  // - Handles negative numbers correctly
  return new Intl.NumberFormat("vi-VN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}
