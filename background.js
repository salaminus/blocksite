// Инициализация хранилища по умолчанию
chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.local.get(['blockedSites', 'blockingEnabled', 'password', 'disabledSites'], function(result) {
    if (!result.blockedSites) {
      chrome.storage.local.set({ blockedSites: [] });
    }
    if (result.blockingEnabled === undefined) {
      chrome.storage.local.set({ blockingEnabled: true });
    }
    if (!result.password) {
      chrome.storage.local.set({ password: 'admin123' });
    }
    if (!result.disabledSites) {
      chrome.storage.local.set({ disabledSites: [] });
    }
  });
});

// Простая и надежная функция проверки блокировки
function shouldBlockSite(hostname, blockedSites, disabledSites) {
  if (!blockedSites || blockedSites.length === 0) return false;
  
  const cleanHostname = hostname.toLowerCase().replace('www.', '');
  
  // Проверяем каждый заблокированный сайт
  for (const blockedSite of blockedSites) {
    const cleanBlocked = blockedSite.toLowerCase().replace('www.', '');
    
    // Простое сравнение: точное совпадение или поддомен
    if (cleanHostname === cleanBlocked || cleanHostname.endsWith('.' + cleanBlocked)) {
      // Проверяем, не отключен ли этот сайт
      let isDisabled = false;
      for (const disabledSite of disabledSites || []) {
        const cleanDisabled = disabledSite.toLowerCase().replace('www.', '');
        if (cleanBlocked === cleanDisabled) {
          isDisabled = true;
          break;
        }
      }
      
      // Если сайт заблокирован и не отключен - блокируем
      if (!isDisabled) {
        return true;
      }
    }
  }
  
  return false;
}

// Основной слушатель навигации
chrome.webNavigation.onBeforeNavigate.addListener(function(details) {
  // Не блокируем собственные страницы расширения
  if (details.url.includes('blocked.html') || details.url.startsWith('chrome-extension://')) {
    return;
  }
  
  if (details.frameId === 0) { // Только основная frame
    chrome.storage.local.get(['blockingEnabled', 'blockedSites', 'disabledSites'], function(result) {
      // Если глобальная блокировка выключена - пропускаем
      if (result.blockingEnabled === false) return;
      
      try {
        const url = new URL(details.url);
        const hostname = url.hostname;
        
        if (shouldBlockSite(hostname, result.blockedSites, result.disabledSites)) {
          console.log('🚫 Блокируем:', hostname);
          console.log('📋 Заблокированные:', result.blockedSites);
          console.log('✅ Разрешенные:', result.disabledSites);
          
          // Перенаправляем на страницу блокировки
          chrome.tabs.update(details.tabId, {
            url: chrome.runtime.getURL('blocked.html') + '?url=' + encodeURIComponent(details.url)
          });
        }
      } catch (e) {
        console.error('Ошибка обработки URL:', e);
      }
    });
  }
});

// Слушатель изменений в хранилище - для принудительного обновления
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'local' && (changes.disabledSites || changes.blockedSites)) {
    console.log('🔄 Обновлены настройки блокировки');
    
    // При изменении настроек проверяем все открытые вкладки
    chrome.tabs.query({}, function(tabs) {
      tabs.forEach(function(tab) {
        if (tab.url && !tab.url.includes('blocked.html') && !tab.url.startsWith('chrome://')) {
          // Перезагружаем вкладку чтобы применить новые настройки
          chrome.tabs.reload(tab.id);
        }
      });
    });
  }
});