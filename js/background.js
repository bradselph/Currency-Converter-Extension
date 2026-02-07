/*
 * Currency Converter Extension - Background Script
 * Copyright (C) 2025 Brad Selph
 * Version 1.3.0
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * Exchange Rate APIs used:
 * - ExchangeRate-API: https://www.exchangerate-api.com (Rates By Exchange Rate API)
 * - Fawazahmed0 Currency API: https://github.com/fawazahmed0/currency-api (Open Source)
 * - FreeCurrency API: https://github.com/everapihq (EveryAPI)
 * - Open Exchange Rates: https://open.er-api.com
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "convertCurrency") {
    const { amount, fromCurrency, targetCurrency, exchangerateApiKey, freecurrencyApiKey } = request;

    convertCurrency(amount, fromCurrency, targetCurrency, exchangerateApiKey, freecurrencyApiKey)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));

    return true;
  }

  if (request.type === "updateBadge") {
    const count = request.count;
    chrome.action.setBadgeText({
      text: count > 0 ? count.toString() : "",
      tabId: sender.tab?.id
    });
    chrome.action.setBadgeBackgroundColor({ color: "#228b22" });
  }
});

async function convertCurrency(amount, fromCurrency, targetCurrency = 'USD', exchangerateApiKey = '', freecurrencyApiKey = '') {
  console.log(`[Currency Converter] Converting ${amount} ${fromCurrency} to ${targetCurrency}`);

  const apis = [
    // ExchangeRate-API (Premium with API key)
    // Attribution: Rates By Exchange Rate API (https://www.exchangerate-api.com)
    ...(exchangerateApiKey ? [{
      name: 'exchangerate-api',
      url: `https://v6.exchangerate-api.com/v6/${exchangerateApiKey}/pair/${fromCurrency}/${targetCurrency}/${amount}`,
      parseResponse: (data) => {
        console.log('exchangerate-api response:', data);
        return data.conversion_result;
      }
    }] : []),

    // Fawazahmed0 Currency API (Open Source)
    // Attribution: https://github.com/fawazahmed0/currency-api
    {
      name: 'fawazahmed0-api',
      url: `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${fromCurrency.toLowerCase()}.json`,
      parseResponse: (data) => {
        console.log('fawazahmed0-api response:', data);
        const rate = data[fromCurrency.toLowerCase()]?.[targetCurrency.toLowerCase()];
        return rate ? amount * rate : null;
      }
    },

    // Fawazahmed0 Currency API Fallback
    {
      name: 'fawazahmed0-api-fallback',
      url: `https://latest.currency-api.pages.dev/v1/currencies/${fromCurrency.toLowerCase()}.json`,
      parseResponse: (data) => {
        console.log('fawazahmed0-api-fallback response:', data);
        const rate = data[fromCurrency.toLowerCase()]?.[targetCurrency.toLowerCase()];
        return rate ? amount * rate : null;
      }
    },

    // FreeCurrency API by EveryAPI (Premium with API key)
    // Attribution: https://github.com/everapihq
    ...(freecurrencyApiKey ? [{
      name: 'free-currency-api',
      url: `https://api.freecurrencyapi.com/v1/latest?apikey=${freecurrencyApiKey}&currencies=${targetCurrency}&base_currency=${fromCurrency}`,
      parseResponse: (data) => {
        console.log('free-currency-api response:', data);
        const rate = data.data?.[targetCurrency];
        return rate ? amount * rate : null;
      }
    }] : []),

    // Open Exchange Rates (Free tier)
    // Attribution: https://open.er-api.com
    {
      name: 'backup-api',
      url: `https://open.er-api.com/v6/latest/${fromCurrency}`,
      parseResponse: (data) => {
        console.log('backup-api response:', data);
        const rate = data.rates?.[targetCurrency];
        return rate ? amount * rate : null;
      }
    }
  ];

  for (const api of apis) {
    try {
      console.log(`Trying ${api.name}...`);
      const response = await fetch(api.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn(`${api.name} returned ${response.status}: ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      const convertedAmount = api.parseResponse(data);

      if (convertedAmount !== null && !isNaN(convertedAmount) && convertedAmount > 0) {
        console.log(`Successfully converted via ${api.name}: ${amount} ${fromCurrency} = ${convertedAmount} ${targetCurrency}`);
        return { success: true, convertedAmount: convertedAmount };
      }
    } catch (error) {
      console.warn(`API ${api.name} failed:`, error);
      continue;
    }
  }

  throw new Error('All currency conversion APIs failed');
}