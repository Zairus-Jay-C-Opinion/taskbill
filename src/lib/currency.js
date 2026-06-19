export const CURRENCIES = [
  { code: "PHP", symbol: "₱", country: "ph" },
  { code: "USD", symbol: "$", country: "us" },
  { code: "EUR", symbol: "€", country: "eu" },
  { code: "GBP", symbol: "£", country: "gb" },
  { code: "SGD", symbol: "S$", country: "sg" },
  { code: "AUD", symbol: "A$", country: "au" },
  { code: "JPY", symbol: "¥", country: "jp" },
];

export function currencySymbol(code) {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? "₱";
}
