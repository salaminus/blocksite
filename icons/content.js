// Дополнительная проверка на стороне клиента
setTimeout(function() {
  chrome.storage.local.get(['blockingEnabled', 'blockedSites', 'disabledSites'], function(result) {
    if (result.blockingEnabled !== false && result.blockedSites && result.blockedSites.length > 0) {
      const hostname = window.location.hostname;
      const cleanHostname = hostname.toLowerCase().replace('www.', '');
      
      // Проверяем каждый заблокированный сайт
      for (const site of result.blockedSites) {
        const cleanSite = site.toLowerCase().replace('www.', '');
        
        if (cleanHostname === cleanSite || cleanHostname.endsWith('.' + cleanSite)) {
          // Проверяем, не отключен ли сайт
          let isDisabled = false;
          for (const disabledSite of result.disabledSites || []) {
            const cleanDisabled = disabledSite.toLowerCase().replace('www.', '');
            if (cleanSite === cleanDisabled) {
              isDisabled = true;
              break;
            }
          }
          
          // Если не отключен - блокируем
          if (!isDisabled && !window.location.href.includes('blocked.html')) {
            console.log('ContentScript: Блокируем', hostname);
            window.location.href = chrome.runtime.getURL('blocked.html') + '?url=' + encodeURIComponent(window.location.href);
            return;
          }
        }
      }
    }
  });
}, 100);