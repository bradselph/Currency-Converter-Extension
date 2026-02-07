# Chrome Web Store Listing

Use this content when filling out the Chrome Web Store Developer Dashboard.

---

## Extension Name
Currency Converter Extension

## Summary (132 characters max)
Automatically detects and converts currency values on any web page to your preferred currency using real-time exchange rates.

## Description (16,000 characters max)

Currency Converter Extension automatically detects prices and currency values on any web page and displays the converted amount inline, right next to the original value.

FEATURES

- Automatic Detection: Scans every page you visit for currency symbols and amounts. Supports 40+ currencies including USD, EUR, GBP, JPY, INR, KRW, and many more.

- Inline Conversions: Converted values appear directly next to the original price in a clean, unobtrusive green label. No popups, no extra clicks — just glance at the converted amount.

- 21 Target Currencies: Convert to US Dollar, Euro, British Pound, Japanese Yen, Canadian Dollar, Australian Dollar, Swiss Franc, Chinese Yuan, Hong Kong Dollar, Indian Rupee, South Korean Won, Mexican Peso, Norwegian Krone, New Zealand Dollar, Polish Zloty, Brazilian Real, Russian Ruble, Swedish Krona, Singapore Dollar, Turkish Lira, or South African Rand.

- Multiple API Sources: Uses up to 5 exchange rate APIs with automatic fallback for maximum reliability. Works out of the box with free APIs — no API key required.

- Optional API Keys: Add your own ExchangeRate-API or FreeCurrency API key for higher rate limits and enhanced reliability.

- Easy Toggle: Enable or disable the extension with one click from the popup.

- Statistics: See how many conversions were found on the current page and which currencies were detected.

- Rescan: Force a rescan of the current page at any time.

- Dynamic Content: Automatically detects and converts prices that load dynamically (AJAX, infinite scroll, etc.) using a MutationObserver.

- Lightweight: Pure vanilla JavaScript with zero external dependencies. No frameworks, no bloat.

- Privacy First: No personal data is collected. No tracking. No analytics. All settings are stored locally in your browser. Only currency pair information is sent to exchange rate APIs. Full privacy policy included.

- Open Source: Licensed under AGPL-3.0. Review the complete source code on GitHub.

HOW IT WORKS

1. Browse any website with prices in foreign currencies.
2. The extension automatically detects currency symbols and amounts.
3. Converted values appear inline next to the original price.
4. Click the extension icon to view statistics or change settings.

SUPPORTED SOURCE CURRENCIES

$, €, £, ¥, ₹, ₩, ₽, ₺, ₴, ₪, ₱, ₦, ₵, ₾, ₸, ₭, ₮, ₫, ₡, ₼, ৳, ៛, Kč, kr, zł, lei, Ft, Rp, лв, ден, din, HK$, S$, NT$, C$, RD$, G$, J$, TT$, Z$, Br, Bs., MT, USh, R, ƒ, ֏, ฿

EXCHANGE RATE SOURCES

- Fawazahmed0 Currency API (open source, no key required)
- Open Exchange Rates (free, no key required)
- ExchangeRate-API (optional API key for premium access)
- FreeCurrency API by EveryAPI (optional API key for premium access)

PERMISSIONS EXPLAINED

- "Read and change all your data on all websites": Required to scan page content for currency values and insert inline conversions. The extension only reads text content to find currency amounts — it does not collect, store, or transmit any page data.
- Storage: Saves your settings (target currency, optional API keys) locally.

## Category
Productivity

## Language
English

## Single Purpose Description
This extension converts foreign currency values found on web pages to the user's preferred target currency.

---

## Screenshots (in order)

1. screenshot_popup_overview.png — Extension popup showing conversion statistics and detected currencies
2. screenshot_inline_conversion.png — Inline currency conversions on a shopping page
3. screenshot_settings.png — Settings tab with target currency and API key configuration
4. screenshot_multi_currency.png — Multiple currencies converted on a travel planning page
5. screenshot_about.png — About tab with version info, credits, and API attribution

## Privacy Practices (for CWS Developer Dashboard)

### Single Purpose
Converts foreign currency values on web pages to the user's preferred currency.

### Permission Justifications
- **Host Permissions (API domains)**: Required to fetch real-time exchange rates from currency conversion APIs.
- **activeTab**: Required to access the current tab for injecting the content script.
- **scripting**: Required to inject the currency detection content script into web pages.
- **storage**: Required to save user preferences (target currency, API keys) locally.

### Data Usage Disclosures
- **Personally identifiable information**: Not collected
- **Health information**: Not collected
- **Financial and payment information**: Not collected
- **Authentication information**: Not collected
- **Personal communications**: Not collected
- **Location**: Not collected
- **Web history**: Not collected
- **User activity**: Not collected
- **Website content**: Not collected (only currency values are read locally and never transmitted)

### Are you using remote code?
No

### Privacy Policy URL
Host your PRIVACY.md at: https://github.com/bradselph/Currency-Converter-Extension/blob/main/PRIVACY.md
