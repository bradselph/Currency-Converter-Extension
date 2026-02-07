/*
 * Currency Converter Extension - Content Script
 * Copyright (C) 2025 Brad Selph
 * Version 1.3.0
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
const insertedConversions = new Map();
let isProcessing = false;
let pageFullyLoaded = false;
let conversionQueue = [];

const DEBUG = false;
function debugLog(...args) {
  if (DEBUG) console.log('[Currency Converter]', ...args);
}

let pageLoadTimeout;
function markPageAsLoaded() {
  pageFullyLoaded = true;
  debugLog('Page marked as fully loaded, processing queued conversions');
  processQueuedConversions();
}

function processQueuedConversions() {
  if (conversionQueue.length > 0) {
    debugLog('Processing', conversionQueue.length, 'queued conversions');
    conversionQueue.forEach(item => {
      if (document.body.contains(item.textNode)) {
        convertCurrency(item.textNode, item.matchData);
      }
    });
    conversionQueue = [];
  }
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
  insertedConversions.clear();
  conversionQueue = [];
  isProcessing = false;
}

function walkDOM(node, callback) {
  if (node.nodeType === 1 &&
    (node.classList?.contains('currency-converter-result') ||
      node.closest?.('.currency-converter-result'))) {
    return;
  }

  if (node.nodeType === 3 && node.nodeValue && node.nodeValue.trim()) {
    callback(node);
  } else if (node.nodeType === 1 &&
    !['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SVG'].includes(node.tagName)) {
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
  if (!text || text.trim().length < 3) return;

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
    if (!currency || currency === settings.targetCurrency) continue;

    const numericAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(numericAmount) || numericAmount <= 0) continue;

    const conversionKey = `${match[0]}-${currency}-${settings.targetCurrency}-${numericAmount}`;

    if (pendingConversions.has(conversionKey)) {
      continue;
    }

    matches.push({
      fullMatch: match[0],
      symbol,
      amount,
      index: match.index,
      currency,
      originalText: match[0],
      conversionKey,
      numericAmount
    });
  }

  if (matches.length > 0) {
    debugLog(`Found ${matches.length} currency matches in text:`, text.substring(0, 100));
    processMatches(textNode, matches);
    processedTexts.add(text);
  }

  processedElements.add(textNode);
}

function processMatches(textNode, matches) {
  matches.forEach(matchData => {
    pendingConversions.add(matchData.conversionKey);

    if (!pageFullyLoaded) {
      conversionQueue.push({ textNode, matchData });
      debugLog('Queued conversion for later:', matchData.originalText);
    } else {
      convertCurrency(textNode, matchData);
    }
  });
}

function convertCurrency(textNode, matchData) {
  const { amount, currency, conversionKey, numericAmount } = matchData;

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
      setTimeout(() => {
        if (textNode && textNode.parentNode && document.body.contains(textNode)) {
          insertConversionRobust(textNode, matchData, response.convertedAmount);
        } else {
          debugLog('Text node no longer in DOM, attempting alternative insertion');
          retryConversionInsertion(matchData, response.convertedAmount);
        }
      }, 100);

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
    } else {
      console.warn('Conversion failed for:', numericAmount, currency, response);
    }
  });
}

function insertConversionRobust(originalTextNode, matchData, convertedAmount) {
  try {
    if (!originalTextNode.parentNode || !document.body.contains(originalTextNode)) {
      debugLog('Text node no longer in DOM, skipping insertion');
      return;
    }

    const { fullMatch, index } = matchData;
    const parent = originalTextNode.parentNode;
    const text = originalTextNode.nodeValue;

    if (insertedConversions.has(fullMatch)) {
      debugLog('Conversion already inserted for:', fullMatch);
      return;
    }

    const targetSymbol = getSymbolForCurrency(settings.targetCurrency);
    const conversionText = ` (≈ ${targetSymbol}${convertedAmount.toFixed(2)} ${settings.targetCurrency})`;

    let success = false;

    success = insertAsAppend(parent, conversionText);

    if (!success) {
      success = insertAsNextSibling(originalTextNode, conversionText);
    }

    if (!success) {
      success = insertWithReplace(originalTextNode, matchData, conversionText);
    }

    if (success) {
      insertedConversions.set(fullMatch, true);
      debugLog('Successfully inserted conversion for:', fullMatch);
    } else {
      debugLog('All insertion strategies failed for:', fullMatch);
    }

  } catch (error) {
    console.error('Failed to insert conversion:', error);
    debugLog('Insertion failed for:', matchData.fullMatch, error);
  }
}

function insertAsAppend(parent, conversionText) {
  try {
    if (!parent || parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') {
      return false;
    }

    const conversionSpan = document.createElement('span');
    conversionSpan.className = 'currency-converter-result';
    conversionSpan.textContent = conversionText;
    conversionSpan.setAttribute('data-currency-converter', 'true');

    parent.appendChild(conversionSpan);
    return true;
  } catch (error) {
    debugLog('Append strategy failed:', error);
    return false;
  }
}

function insertAsNextSibling(textNode, conversionText) {
  try {
    const parent = textNode.parentNode;
    if (!parent) return false;

    const conversionSpan = document.createElement('span');
    conversionSpan.className = 'currency-converter-result';
    conversionSpan.textContent = conversionText;
    conversionSpan.setAttribute('data-currency-converter', 'true');

    if (textNode.nextSibling) {
      parent.insertBefore(conversionSpan, textNode.nextSibling);
    } else {
      parent.appendChild(conversionSpan);
    }
    return true;
  } catch (error) {
    debugLog('Next sibling strategy failed:', error);
    return false;
  }
}

function insertWithReplace(originalTextNode, matchData, conversionText) {
  try {
    const { fullMatch, index } = matchData;
    const parent = originalTextNode.parentNode;
    const text = originalTextNode.nodeValue;

    const wrapper = document.createElement('span');
    wrapper.style.cssText = 'display: inline !important;';

    const beforeText = text.slice(0, index + fullMatch.length);
    const afterText = text.slice(index + fullMatch.length);

    const conversionSpan = document.createElement('span');
    conversionSpan.className = 'currency-converter-result';
    conversionSpan.textContent = conversionText;
    conversionSpan.setAttribute('data-currency-converter', 'true');

    wrapper.appendChild(document.createTextNode(beforeText));
    wrapper.appendChild(conversionSpan);
    if (afterText.trim()) {
      wrapper.appendChild(document.createTextNode(afterText));
    }

    parent.replaceChild(wrapper, originalTextNode);
    return true;
  } catch (error) {
    debugLog('Replace strategy failed:', error);
    return false;
  }
}

function retryConversionInsertion(matchData, convertedAmount) {
  try {
    const { originalText, fullMatch } = matchData;
    const textToFind = fullMatch.trim();

    debugLog('Attempting to find text again:', textToFind);

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (node.nodeValue &&
            node.nodeValue.includes(textToFind) &&
            !node.parentNode?.classList?.contains('currency-converter-result') &&
            !insertedConversions.has(textToFind)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );

    const matchingNode = walker.nextNode();
    if (matchingNode) {
      debugLog('Found matching text node on retry, inserting conversion');
      insertConversionRobust(matchingNode, matchData, convertedAmount);
    } else {
      debugLog('Could not find text on retry, trying DOM search approach');
      insertByDOMSearch(textToFind, convertedAmount);
    }
  } catch (error) {
    debugLog('Retry insertion failed:', error);
  }
}

function insertByDOMSearch(textToFind, convertedAmount) {
  try {
    const allElements = document.querySelectorAll('*:not(script):not(style):not(.currency-converter-result)');

    for (const element of allElements) {
      if (element.textContent && element.textContent.includes(textToFind)) {
        const targetSymbol = getSymbolForCurrency(settings.targetCurrency);
        const conversionText = ` (≈ ${targetSymbol}${convertedAmount.toFixed(2)} ${settings.targetCurrency})`;

        const conversionSpan = document.createElement('span');
        conversionSpan.className = 'currency-converter-result';
        conversionSpan.textContent = conversionText;
        conversionSpan.setAttribute('data-currency-converter', 'true');

        element.appendChild(conversionSpan);
        insertedConversions.set(textToFind, true);
        debugLog('Inserted conversion via DOM search for:', textToFind);
        break;
      }
    }
  } catch (error) {
    debugLog('DOM search insertion failed:', error);
  }
}

function getSymbolForCurrency(currencyCode) {
  const symbolMap = Object.entries(currencyMap).find(([symbol, code]) => code === currencyCode);
  return symbolMap ? symbolMap[0] : '';
}

function removeAllConversions() {
  const conversions = document.querySelectorAll('.currency-converter-result, [data-currency-converter="true"]');
  debugLog('Removing', conversions.length, 'existing conversions');

  conversions.forEach(span => {
    try {
      const parentWrapper = span.parentNode;
      if (parentWrapper && parentWrapper.tagName === 'SPAN' && parentWrapper.style.display === 'inline') {
        const textContent = parentWrapper.textContent.replace(span.textContent, '');
        const textNode = document.createTextNode(textContent);
        parentWrapper.parentNode.replaceChild(textNode, parentWrapper);
      } else {
        span.remove();
      }
    } catch (error) {
      debugLog('Error removing conversion:', error);
    }
  });

  conversionsFound = [];
  totalConversions = 0;
  insertedConversions.clear();
  chrome.runtime.sendMessage({ type: "updateBadge", count: 0 });
}

function scanPage() {
  if (!extensionEnabled || isProcessing) return;

  isProcessing = true;
  debugLog('Scanning page for currencies...');

  clearProcessedData();

  clearTimeout(pageLoadTimeout);
  pageLoadTimeout = setTimeout(markPageAsLoaded, 3000);

  walkDOM(document.body, processTextNode);

  setTimeout(() => {
    isProcessing = false;
    debugLog('Scan complete. Found currencies:', conversionsFound.length);
  }, 5000);
}

function injectConversionStyles() {
  if (document.getElementById('currency-converter-styles')) return;

  const style = document.createElement('style');
  style.id = 'currency-converter-styles';
  style.textContent = `
    .currency-converter-result,
    [data-currency-converter="true"] {
      color: #228b22 !important;
      font-size: 90% !important;
      margin-left: 4px !important;
      font-weight: normal !important;
      background: rgba(34, 139, 34, 0.1) !important;
      padding: 1px 4px !important;
      border-radius: 3px !important;
      display: inline !important;
      z-index: 999999 !important;
      position: relative !important;
      white-space: nowrap !important;
      font-family: inherit !important;
      text-decoration: none !important;
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
      opacity: 1 !important;
      visibility: visible !important;
      max-width: none !important;
      max-height: none !important;
      overflow: visible !important;
    }
    
    .currency-converter-result:before,
    .currency-converter-result:after,
    [data-currency-converter="true"]:before,
    [data-currency-converter="true"]:after {
      display: none !important;
    }
  `;

  (document.head || document.documentElement).appendChild(style);
  debugLog('Currency converter styles injected');
}

debugLog('Currency converter content script loaded');

injectConversionStyles();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    injectConversionStyles();
    setTimeout(scanPage, 1000);
  });
} else {
  setTimeout(scanPage, 1000);
}

window.addEventListener('rocket-allScriptsLoaded', () => {
  debugLog('WP Rocket scripts loaded, scanning page');
  setTimeout(scanPage, 500);
}, { isRocket: false });

const observer = new MutationObserver((mutations) => {
  if (!extensionEnabled || isProcessing) return;

  let shouldProcess = false;
  const nodesToProcess = [];
  let hasRemovedConversions = false;

  mutations.forEach((mutation) => {
    mutation.removedNodes.forEach((node) => {
      if (node.nodeType === 1 &&
        (node.classList?.contains('currency-converter-result') ||
          node.querySelector?.('.currency-converter-result') ||
          node.hasAttribute?.('data-currency-converter'))) {
        hasRemovedConversions = true;
        debugLog('Currency conversion removed by page modification');
      }
    });

    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1 &&
        (node.classList?.contains('currency-converter-result') ||
          node.querySelector?.('.currency-converter-result') ||
          node.hasAttribute?.('data-currency-converter'))) {
        return;
      }

      if (node.nodeType === 1 || node.nodeType === 3) {
        nodesToProcess.push(node);
        shouldProcess = true;
      }
    });

    if (mutation.type === 'characterData') {
      const textNode = mutation.target;
      if (textNode.nodeValue &&
        !textNode.parentNode?.classList?.contains('currency-converter-result') &&
        !textNode.parentNode?.hasAttribute?.('data-currency-converter')) {
        nodesToProcess.push(textNode);
        shouldProcess = true;
      }
    }
  });

  if (shouldProcess || hasRemovedConversions) {
    clearTimeout(window.currencyConverterTimeout);
    window.currencyConverterTimeout = setTimeout(() => {
      if (!isProcessing) {
        debugLog('Processing dynamic content changes');

        if (hasRemovedConversions) {
          const currentConversions = document.querySelectorAll('.currency-converter-result, [data-currency-converter="true"]').length;
          if (currentConversions < totalConversions) {
            totalConversions = currentConversions;
            chrome.runtime.sendMessage({
              type: "updateBadge",
              count: totalConversions
            });
          }
        }

        nodesToProcess.forEach((node) => {
          try {
            if (node.nodeType === 1) {
              walkDOM(node, processTextNode);
            } else if (node.nodeType === 3) {
              processTextNode(node);
            }
          } catch (error) {
            debugLog('Error processing node:', error);
          }
        });
      }
    }, 1000);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true
});
