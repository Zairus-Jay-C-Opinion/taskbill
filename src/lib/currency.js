export const CURRENCIES = [
  { code: "PHP", symbol: "₱", flag: "🇵🇭" },
  { code: "USD", symbol: "$", flag: "🇺🇸" },
  { code: "EUR", symbol: "€", flag: "🇪🇺" },
  { code: "GBP", symbol: "£", flag: "🇬🇧" },
  { code: "SGD", symbol: "S$", flag: "🇸🇬" },
  { code: "AUD", symbol: "A$", flag: "🇦🇺" },
  { code: "JPY", symbol: "¥", flag: "🇯🇵" },
];

export function currencySymbol(code) {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? "₱";
}
