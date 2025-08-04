/*
 * Currency Converter Extension - Content Script
 * Copyright (C) 2025 Brad Selph
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

const CURRENCY_REGEX = /(?:^|[^a-zA-Z\d])(?:(\$|€|£|¥|₹|₩|₽|֏|ƒ|₼|৳|лв|៛|₡|Kč|kr|RD\$|Br|₾|₵|G\$|HK\$|Ft|Rp|₪|J\$|₸|₭|ден|₮|MT|C\$|₦|₱|zł|lei|din|S\$|R|฿|₺|TT\$|NT\$|₴|USh|Bs\.|₫|Z\$)\s?(\d+(?:[.,]\d{3})*(?:[.,]\d{1,2})?)|(\d+(?:[.,]\d{3})*(?:[.,]\d{1,2})?)\s?(\$|€|£|¥|₹|₩|₽|֏|ƒ|₼|৳|лв|៛|₡|Kč|kr|RD\$|Br|₾|₵|G\$|HK\$|Ft|Rp|₪|J\$|₸|₭|ден|₮|MT|C\$|₦|₱|zł|lei|din|S\$|R|฿|₺|TT\$|NT\$|₴|USh|Bs\.|₫|Z\$))(?![a-zA-Z\d])/g;

const currencyMap = {
  "$": "USD", "€": "EUR", "£": "GBP", "¥": "JPY", "₹": "INR", "₩": "KRW", "₽": "RUB",
  "֏": "AMD", "ƒ": "ANG", "₼": "AZN", "৳": "BDT", "лв": "BGN", "៛": "KHR", "₡": "CRC",
  "Kč": "CZK", "kr": "DKK", "RD$": "DOP", "Br": "ETB", "₾": "GEL", "₵": "GHS", "G$": "GYD",
  "HK$": "HKD", "Ft": "HUF", "Rp": "IDR", "₪": "ILS", "J$": "JMD", "₸": "KZT", "₭": "LAK",
  "ден": "MKD", "₮": "MNT", "MT": "MZN", "C$": "NIO", "₦": "NGN", "₱": "PHP", "zł": "PLN",
  "lei": "RON", "din": "RSD", "S$": "SGD", "R": "ZAR", "฿": "THB", "₺": "TRY", "TT$": "TTD",
  "NT$": "TWD", "₴": "UAH", "USh": "UGX", "Bs.": "VES", "₫": "VND", "Z$": "ZWL"
};

let extensionEnabled = true;
let conversionsFound = [];
let totalConversions = 0;
let settings = {
  targetCurrency: 'USD',
  exchangerateApiKey: '',
  freecurrencyApiKey: ''
};

const processedElements = new Set();
const processedTexts = new Set();
const pendingConversions = new Set();
let isProcessing = false;

const DEBUG = true;
function debugLog(...args) {
  if (DEBUG) console.log('[Currency Converter]', ...args);
}

chrome.storage.sync.get(['targetCurrency', 'exchangerateApiKey', 'freecurrencyApiKey'], (result) => {
  settings.targetCurrency = result.targetCurrency || 'USD';
  settings.exchangerateApiKey = result.exchangerateApiKey || '';
  settings.freecurrencyApiKey = result.freecurrencyApiKey || '';
  debugLog('Settings loaded:', settings);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "getStats") {
    sendResponse({
      enabled: extensionEnabled,
      conversionsFound: conversionsFound.length,
      totalConversions: totalConversions,
      currencies: [...new Set(conversionsFound.map(c => c.fromCurrency))],
      settings: settings
    });
  } else if (request.type === "toggleExtension") {
    extensionEnabled = request.enabled;
    debugLog('Extension toggled:', extensionEnabled);
    if (extensionEnabled) {
      scanPage();
    } else {
      removeAllConversions();
    }
    sendResponse({ success: true });
  } else if (request.type === "rescan") {
    debugLog('Rescanning page...');
    if (extensionEnabled) {
      removeAllConversions();
      clearProcessedData();
      scanPage();
    }
    sendResponse({ success: true });
  } else if (request.type === "updateSettings") {
    settings = { ...settings, ...request.settings };
    chrome.storage.sync.set(request.settings);
    debugLog('Settings updated:', settings);
    sendResponse({ success: true });
  }
});

function clearProcessedData() {
  processedElements.clear();
  processedTexts.clear();
  pendingConversions.clear();
  isProcessing = false;
}

function walkDOM(node, callback) {
  if (node.nodeType === 1 &&
    (node.classList?.contains('currency-converter-result') ||
      node.closest?.('.currency-converter-result'))) {
    return;
  }

  if (node.nodeType === 3 && node.nodeValue.trim()) {
    callback(node);
  } else if (node.nodeType === 1 &&
    !['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT'].includes(node.tagName)) {
    for (const child of node.childNodes) {
      walkDOM(child, callback);
    }
  }
}

function processTextNode(textNode) {
  if (!extensionEnabled ||
    !textNode.parentNode ||
    processedElements.has(textNode) ||
    textNode.parentNode.classList?.contains('currency-converter-result')) {
    return;
  }

  const text = textNode.nodeValue;

  if (processedTexts.has(text)) {
    return;
  }

  const matches = [];
  let match;

  CURRENCY_REGEX.lastIndex = 0;
  while ((match = CURRENCY_REGEX.exec(text)) !== null) {
    let symbol, amount;

    if (match[1] && match[2]) {
      symbol = match[1];
      amount = match[2];
    } else if (match[3] && match[4]) {
      amount = match[3];
      symbol = match[4];
    } else {
      continue;
    }

    const currency = currencyMap[symbol];
    const conversionKey = `${match[0]}-${currency}-${settings.targetCurrency}`;

    if (pendingConversions.has(conversionKey)) {
      continue;
    }

    if (currency && currency !== settings.targetCurrency) {
      matches.push({
        fullMatch: match[0],
        symbol,
        amount,
        index: match.index,
        currency,
        originalText: match[0],
        conversionKey
      });
    }
  }

  if (matches.length > 0) {
    debugLog(`Found ${matches.length} currency matches in text:`, text.substring(0, 100));
    processMatches(textNode, matches);
    processedTexts.add(text);
  }

  processedElements.add(textNode);
}

function processMatches(textNode, matches) {
  const matchData = matches[0];

  pendingConversions.add(matchData.conversionKey);

  convertCurrency(textNode, matchData);
}

function convertCurrency(textNode, matchData) {
  const { amount, currency, conversionKey } = matchData;
  const numericAmount = parseFloat(amount.replace(/,/g, ''));

  debugLog('Converting:', numericAmount, currency, 'to', settings.targetCurrency);

  chrome.runtime.sendMessage({
    type: "convertCurrency",
    amount: numericAmount,
    fromCurrency: currency,
    targetCurrency: settings.targetCurrency,
    exchangerateApiKey: settings.exchangerateApiKey,
    freecurrencyApiKey: settings.freecurrencyApiKey
  }, (response) => {
    pendingConversions.delete(conversionKey);

    if (chrome.runtime.lastError) {
      console.error('Extension error:', chrome.runtime.lastError);
      return;
    }

    debugLog('Conversion response:', response);

    if (response?.success && response.convertedAmount != null) {
      if (textNode.parentNode && !textNode.parentNode.querySelector('.currency-converter-result')) {
        insertConversion(textNode, matchData, response.convertedAmount);

        conversionsFound.push({
          fromCurrency: currency,
          fromAmount: numericAmount,
          convertedAmount: response.convertedAmount,
          targetCurrency: settings.targetCurrency,
          originalText: matchData.originalText
        });
        totalConversions++;

        chrome.runtime.sendMessage({
          type: "updateBadge",
          count: totalConversions
        });

        debugLog('Successfully converted:', numericAmount, currency, 'to', response.convertedAmount, settings.targetCurrency);
      }
    } else {
      console.warn('Conversion failed for:', numericAmount, currency, response);
    }
  });
}

function insertConversion(originalTextNode, matchData, convertedAmount) {
  if (!originalTextNode.parentNode) return;

  const { fullMatch, index } = matchData;
  const parent = originalTextNode.parentNode;
  const text = originalTextNode.nodeValue;

  const wrapper = document.createElement('span');
  wrapper.style.display = 'inline';

  const beforeText = text.slice(0, index + fullMatch.length);
  const afterText = text.slice(index + fullMatch.length);

  const targetSymbol = getSymbolForCurrency(settings.targetCurrency);
  const conversionSpan = document.createElement("span");
  conversionSpan.className = "currency-converter-result";
  conversionSpan.textContent = ` (≈ ${targetSymbol}${convertedAmount.toFixed(2)} ${settings.targetCurrency})`;
  conversionSpan.style.cssText = `
    color: #228b22;
    font-size: 90%;
    margin-left: 4px;
    font-weight: normal;
    background: rgba(34, 139, 34, 0.1);
    padding: 1px 4px;
    border-radius: 3px;
    display: inline;
  `;

  wrapper.appendChild(document.createTextNode(beforeText));
  wrapper.appendChild(conversionSpan);
  if (afterText) {
    wrapper.appendChild(document.createTextNode(afterText));
  }

  parent.replaceChild(wrapper, originalTextNode);

  debugLog('Inserted conversion display for:', fullMatch);
}

function getSymbolForCurrency(currencyCode) {
  const symbolMap = Object.entries(currencyMap).find(([symbol, code]) => code === currencyCode);
  return symbolMap ? symbolMap[0] : '';
}

function removeAllConversions() {
  const conversions = document.querySelectorAll('.currency-converter-result');
  debugLog('Removing', conversions.length, 'existing conversions');

  conversions.forEach(span => {
    const parentWrapper = span.parentNode;
    if (parentWrapper && parentWrapper.tagName === 'SPAN' && parentWrapper.style.display === 'inline') {
      const textContent = parentWrapper.textContent.replace(span.textContent, '');
      const textNode = document.createTextNode(textContent);
      parentWrapper.parentNode.replaceChild(textNode, parentWrapper);
    } else {
      span.remove();
    }
  });

  conversionsFound = [];
  totalConversions = 0;
  chrome.runtime.sendMessage({ type: "updateBadge", count: 0 });
}

function scanPage() {
  if (!extensionEnabled || isProcessing) return;

  isProcessing = true;
  debugLog('Scanning page for currencies...');

  clearProcessedData();

  walkDOM(document.body, processTextNode);

  setTimeout(() => {
    isProcessing = false;
    debugLog('Scan complete. Found currencies:', conversionsFound.length);
  }, 5000);
}

debugLog('Currency converter content script loaded');
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scanPage);
} else {
  scanPage();
}

const observer = new MutationObserver((mutations) => {
  if (!extensionEnabled || isProcessing) return;

  let shouldProcess = false;
  const nodesToProcess = [];

  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1 &&
        (node.classList?.contains('currency-converter-result') ||
          node.querySelector?.('.currency-converter-result'))) {
        return;
      }

      if (node.nodeType === 1 || node.nodeType === 3) {
        nodesToProcess.push(node);
        shouldProcess = true;
      }
    });
  });

  if (shouldProcess) {
    clearTimeout(window.currencyConverterTimeout);
    window.currencyConverterTimeout = setTimeout(() => {
      if (!isProcessing) {
        debugLog('Processing dynamic content changes');
        nodesToProcess.forEach((node) => {
          if (node.nodeType === 1) {
            walkDOM(node, processTextNode);
          } else if (node.nodeType === 3) {
            processTextNode(node);
          }
        });
      }
    }, 1000);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});