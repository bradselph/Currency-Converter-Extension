document.addEventListener('DOMContentLoaded', async () => {
  const toggleSwitch = document.getElementById('toggleExtension');
  const statusDiv = document.getElementById('status');
  const loadingDiv = document.getElementById('loading');
  const conversionsCount = document.getElementById('conversionsCount');
  const totalCount = document.getElementById('totalCount');
  const targetCurrency = document.getElementById('targetCurrency');
  const pageStatus = document.getElementById('pageStatus');
  const currenciesSection = document.getElementById('currenciesSection');
  const currencyList = document.getElementById('currencyList');
  const rescanBtn = document.getElementById('rescanBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const targetCurrencySelect = document.getElementById('targetCurrencySelect');
  const exchangerateApiKey = document.getElementById('exchangerateApiKey');
  const freecurrencyApiKey = document.getElementById('freecurrencyApiKey');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const resetSettingsBtn = document.getElementById('resetSettingsBtn');
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  loadManifestInfo();

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });

  loadingDiv.style.display = 'block';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  loadSettings();

  setTimeout(async () => {
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: "getStats" });
      updateUI(response);
    } catch (error) {
      console.log('No content script found, injecting...');
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['js/content.js']
        });

        setTimeout(async () => {
          try {
            const response = await chrome.tabs.sendMessage(tab.id, { type: "getStats" });
            updateUI(response);
          } catch (e) {
            showError();
          }
        }, 500);
      } catch (e) {
        showError();
      }
    }
  }, 100);

  async function loadManifestInfo() {
    try {
      const manifest = chrome.runtime.getManifest();

      const aboutExtensionName = document.getElementById('about-extension-name');
      const aboutVersion = document.getElementById('about-version');
      const aboutDescription = document.getElementById('about-description');
      const aboutAuthor = document.getElementById('about-author');

      if (aboutExtensionName) {
        aboutExtensionName.textContent = manifest.name || 'Currency Converter Extension';
      }

      if (aboutVersion) {
        aboutVersion.textContent = manifest.version || '1.3.0';
      }

      if (aboutDescription) {
        let description = manifest.description || 'Automatically detects and converts currency values on web pages to your preferred target currency using reliable exchange rate APIs.';
        const developedByIndex = description.indexOf('Developed by');
        if (developedByIndex !== -1) {
          description = description.substring(0, developedByIndex).trim();
        }
        aboutDescription.textContent = description;
      }

      if (aboutAuthor) {
        let author = manifest.author || 'Brad Selph';
        const parenIndex = author.indexOf('(');
        if (parenIndex !== -1) {
          author = author.substring(0, parenIndex).trim();
        }
        aboutAuthor.textContent = author;
      }

      const githubLink = document.querySelector('.github-link');
      if (githubLink && manifest.homepage_url) {
        githubLink.href = manifest.homepage_url;
      }

      const supportLink = document.querySelector('a[href*="issues"]');
      if (supportLink && manifest.homepage_url) {
        supportLink.href = `${manifest.homepage_url}/issues`;
      }

      console.log('Manifest info loaded:', {
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        author: manifest.author,
        homepage_url: manifest.homepage_url
      });

    } catch (error) {
      console.error('Failed to load manifest info:', error);
    }
  }

  function loadSettings() {
    chrome.storage.sync.get(['targetCurrency', 'exchangerateApiKey', 'freecurrencyApiKey'], (result) => {
      targetCurrencySelect.value = result.targetCurrency || 'USD';
      exchangerateApiKey.value = result.exchangerateApiKey || '';
      freecurrencyApiKey.value = result.freecurrencyApiKey || '';
    });
  }

  function updateUI(stats) {
    loadingDiv.style.display = 'none';

    if (stats) {
      toggleSwitch.checked = stats.enabled;
      conversionsCount.textContent = stats.conversionsFound || 0;
      totalCount.textContent = stats.totalConversions || 0;
      targetCurrency.textContent = stats.settings?.targetCurrency || 'USD';

      if (stats.enabled) {
        statusDiv.className = 'status enabled';
        statusDiv.textContent = 'Extension is active and monitoring for currencies';
        pageStatus.textContent = stats.conversionsFound > 0 ? 'Currencies found' : 'No currencies detected';
      } else {
        statusDiv.className = 'status disabled';
        statusDiv.textContent = 'Extension is disabled';
        pageStatus.textContent = 'Disabled';
      }

      if (stats.currencies && stats.currencies.length > 0) {
        currenciesSection.style.display = 'block';
        currencyList.innerHTML = stats.currencies
          .map(currency => `<span class="currency-tag">${currency}</span>`)
          .join('');
      } else {
        currenciesSection.style.display = 'none';
      }
    }
  }

  function showError() {
    loadingDiv.style.display = 'none';
    pageStatus.textContent = 'Error loading';
    conversionsCount.textContent = '—';
    totalCount.textContent = '—';
  }

  toggleSwitch.addEventListener('change', async () => {
    const enabled = toggleSwitch.checked;
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: "toggleExtension",
        enabled: enabled
      });

      if (enabled) {
        statusDiv.className = 'status enabled';
        statusDiv.textContent = 'Extension is active and monitoring for currencies';
      } else {
        statusDiv.className = 'status disabled';
        statusDiv.textContent = 'Extension is disabled';
        conversionsCount.textContent = '0';
        totalCount.textContent = '0';
        currenciesSection.style.display = 'none';
      }
    } catch (error) {
      console.error('Failed to toggle extension:', error);
    }
  });

  rescanBtn.addEventListener('click', async () => {
    rescanBtn.textContent = 'Scanning...';
    rescanBtn.disabled = true;

    try {
      await chrome.tabs.sendMessage(tab.id, { type: "rescan" });

      setTimeout(async () => {
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { type: "getStats" });
          updateUI(response);
        } catch (e) {
          console.error('Failed to get updated stats:', e);
        }

        rescanBtn.textContent = 'Rescan Page';
        rescanBtn.disabled = false;
      }, 2000);
    } catch (error) {
      console.error('Failed to rescan:', error);
      rescanBtn.textContent = 'Rescan Page';
      rescanBtn.disabled = false;
    }
  });

  refreshBtn.addEventListener('click', async () => {
    refreshBtn.textContent = 'Refreshing...';
    refreshBtn.disabled = true;

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: "getStats" });
      updateUI(response);
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    }

    refreshBtn.textContent = 'Refresh Stats';
    refreshBtn.disabled = false;
  });

  saveSettingsBtn.addEventListener('click', async () => {
    const settings = {
      targetCurrency: targetCurrencySelect.value,
      exchangerateApiKey: exchangerateApiKey.value,
      freecurrencyApiKey: freecurrencyApiKey.value
    };

    chrome.storage.sync.set(settings, () => {
      chrome.tabs.sendMessage(tab.id, {
        type: "updateSettings",
        settings: settings
      });

      saveSettingsBtn.textContent = 'Saved!';
      setTimeout(() => {
        saveSettingsBtn.textContent = 'Save Settings';
      }, 2000);
    });
  });

  resetSettingsBtn.addEventListener('click', () => {
    targetCurrencySelect.value = 'USD';
    exchangerateApiKey.value = '';
    freecurrencyApiKey.value = '';
  });
});