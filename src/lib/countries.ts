export type CountryConfig = {
  code: string;
  name: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  fashionContext: string;
};

export const COUNTRIES: CountryConfig[] = [
  { code: "US", name: "United States", flag: "🇺🇸", currency: "USD", currencySymbol: "$", fashionContext: "American streetwear, preppy, workwear, athleisure trends" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", currency: "GBP", currencySymbol: "£", fashionContext: "British fashion, smart-casual, London streetwear, heritage brands" },
  { code: "IN", name: "India", flag: "🇮🇳", currency: "INR", currencySymbol: "₹", fashionContext: "Indian fashion, Indo-western fusion, ethnic wear, Bollywood-inspired trends" },
  { code: "DE", name: "Germany", flag: "🇩🇪", currency: "EUR", currencySymbol: "€", fashionContext: "German minimalist fashion, functional style, European trends" },
  { code: "FR", name: "France", flag: "🇫🇷", currency: "EUR", currencySymbol: "€", fashionContext: "Parisian chic, haute couture influence, effortless elegance" },
  { code: "IT", name: "Italy", flag: "🇮🇹", currency: "EUR", currencySymbol: "€", fashionContext: "Italian luxury fashion, Mediterranean style, tailored fits" },
  { code: "JP", name: "Japan", flag: "🇯🇵", currency: "JPY", currencySymbol: "¥", fashionContext: "Japanese streetwear, Harajuku, minimalist, techwear trends" },
  { code: "KR", name: "South Korea", flag: "🇰🇷", currency: "KRW", currencySymbol: "₩", fashionContext: "K-fashion, Korean streetwear, K-pop inspired trends" },
  { code: "AU", name: "Australia", flag: "🇦🇺", currency: "AUD", currencySymbol: "A$", fashionContext: "Australian coastal style, relaxed fit, outdoor fashion" },
  { code: "CA", name: "Canada", flag: "🇨🇦", currency: "CAD", currencySymbol: "C$", fashionContext: "Canadian fashion, layering, outdoor-meets-urban style" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", currency: "BRL", currencySymbol: "R$", fashionContext: "Brazilian fashion, vibrant colors, tropical casual, beachwear" },
  { code: "AE", name: "UAE", flag: "🇦🇪", currency: "AED", currencySymbol: "د.إ", fashionContext: "Middle Eastern luxury fashion, modest fashion, high-end brands" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", currency: "SAR", currencySymbol: "﷼", fashionContext: "Saudi fashion, modest luxury, traditional meets modern" },
  { code: "MX", name: "Mexico", flag: "🇲🇽", currency: "MXN", currencySymbol: "MX$", fashionContext: "Mexican fashion, colorful patterns, casual Latin American style" },
  { code: "SG", name: "Singapore", flag: "🇸🇬", currency: "SGD", currencySymbol: "S$", fashionContext: "Singaporean fashion, tropical smart-casual, Asian fusion style" },
  { code: "SE", name: "Sweden", flag: "🇸🇪", currency: "SEK", currencySymbol: "kr", fashionContext: "Scandinavian minimalism, sustainable fashion, clean lines" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", currency: "NGN", currencySymbol: "₦", fashionContext: "Nigerian fashion, Ankara prints, vibrant African style" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", currency: "ZAR", currencySymbol: "R", fashionContext: "South African fashion, vibrant prints, African contemporary" },
  { code: "TR", name: "Turkey", flag: "🇹🇷", currency: "TRY", currencySymbol: "₺", fashionContext: "Turkish fashion, East-meets-West style, modern modest fashion" },
  { code: "CN", name: "China", flag: "🇨🇳", currency: "CNY", currencySymbol: "¥", fashionContext: "Chinese fashion, guochao trend, tech-influenced streetwear" },
];

export function getCountryByCode(code: string | null): CountryConfig | null {
  if (!code) return null;
  return COUNTRIES.find((c) => c.code === code) || null;
}
