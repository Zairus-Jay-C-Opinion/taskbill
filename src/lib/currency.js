export const CURRENCIES = [
  { code: "PHP", symbol: "₱" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "SGD", symbol: "S$" },
  { code: "AUD", symbol: "A$" },
  { code: "JPY", symbol: "¥" },
];

export function currencySymbol(code) {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? "₱";
}
