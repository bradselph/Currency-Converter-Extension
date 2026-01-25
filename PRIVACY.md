# Privacy Policy for Currency Converter Extension

**Last Updated:** January 25, 2026

## Overview

Currency Converter Extension is committed to protecting your privacy. This privacy policy explains what information we collect, how we use it, and your rights regarding your data.

## Summary

- We do **not** collect any personal information
- We do **not** track your browsing activity
- We do **not** sell or share any data with third parties
- All settings are stored locally in your browser

## Information We Collect

### Information We Do NOT Collect

- Personal identification information (name, email, address)
- Browsing history or web activity
- Financial or payment information
- Authentication credentials
- Location data
- Health information
- Personal communications

### Information Stored Locally

The extension stores the following data locally in your browser using Chrome's sync storage:

- **Target Currency Preference:** Your selected currency for conversions (e.g., USD, EUR)
- **API Keys (Optional):** If you choose to provide API keys for premium exchange rate services, these are stored locally in your browser

This data:
- Never leaves your browser except through Chrome's built-in sync feature (tied to your Google account)
- Is not accessible to us or any third party
- Can be cleared by uninstalling the extension or clearing browser data

## External Services

The extension makes requests to the following exchange rate APIs to fetch current conversion rates:

- ExchangeRate-API (exchangerate-api.com)
- Fawazahmed0 Currency API (via cdn.jsdelivr.net and currency-api.pages.dev)
- FreeCurrencyAPI (freecurrencyapi.com)
- Open Exchange Rates (open.er-api.com)

### What is sent to these APIs:

- The currency pair being converted (e.g., EUR to USD)
- Standard HTTP headers (User-Agent, Accept)

### What is NOT sent:

- Personal information
- Browsing history
- Page content
- Any identifying information

These API requests are made solely to retrieve current exchange rates and contain no personal or tracking data.

## Data Security

- All API communications use HTTPS encryption
- No data is stored on external servers
- The extension operates entirely within your browser
- Source code is open source and available for review

## Your Rights

You have the right to:

- **Access:** View your stored settings through the extension popup
- **Modify:** Change your preferences at any time
- **Delete:** Remove all stored data by uninstalling the extension or clearing Chrome storage

## Children's Privacy

This extension does not knowingly collect any information from children under 13 years of age.

## Changes to This Policy

We may update this privacy policy from time to time. Any changes will be reflected in the "Last Updated" date at the top of this document.

## Open Source

This extension is open source under the AGPL-3.0 license. You can review the complete source code at:
https://github.com/bradselph/Currency-Converter-Extension

## Contact

If you have any questions about this privacy policy, please open an issue on our GitHub repository:
https://github.com/bradselph/Currency-Converter-Extension/issues

---

**In Plain Language:** This extension converts currency values on web pages. It only stores your currency preference locally in your browser. It fetches exchange rates from public APIs but sends no personal information. We don't collect, track, or sell any of your data.
