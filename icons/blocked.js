document.addEventListener('DOMContentLoaded', function() {
  const blockedUrlElement = document.getElementById('blockedUrl');
  const passwordInput = document.getElementById('passwordInput');
  const unlockButton = document.getElementById('unlockButton');
  const backButton = document.getElementById('backButton');
  const messageElement = document.getElementById('message');

  // Получаем URL из параметров
  const urlParams = new URLSearchParams(window.location.search);
  const blockedUrl = urlParams.get('url');
  let originalHostname = '';
  
  if (blockedUrl) {
    try {
      const urlObj = new URL(blockedUrl);
      originalHostname = urlObj.hostname;
      blockedUrlElement.textContent = urlObj.hostname;
    } catch (e) {
      originalHostname = blockedUrl;
      blockedUrlElement.textContent = blockedUrl;
    }
  }

  // Разблокировка по паролю
  unlockButton.addEventListener('click', function() {
    unlockWebsite();
  });

  // Разблокировка по Enter
  passwordInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      unlockWebsite();
    }
  });

  // Кнопка "Назад"
  backButton.addEventListener('click', function() {
    history.back();
  });

  // Автофокус на поле пароля
  passwordInput.focus();

  function unlockWebsite() {
    const password = passwordInput.value;
    
    if (!password) {
      showMessage('Введите пароль', 'error');
      return;
    }
    
    chrome.storage.local.get(['password', 'disabledSites'], function(result) {
      if (result.password === password) {
        // ВРЕМЕННО разрешаем сайт - добавляем в disabledSites
        const disabledSites = result.disabledSites || [];
        const cleanHostname = originalHostname.toLowerCase().replace('www.', '');
        
        // Находим точное название сайта из blockedSites
        chrome.storage.local.get(['blockedSites'], function(blockedResult) {
          let siteToDisable = originalHostname;
          
          // Ищем точное соответствие в blockedSites
          if (blockedResult.blockedSites) {
            const matchedSite = blockedResult.blockedSites.find(site => {
              const cleanSite = site.toLowerCase().replace('www.', '');
              return cleanSite === cleanHostname || cleanHostname.endsWith('.' + cleanSite);
            });
            
            if (matchedSite) {
              siteToDisable = matchedSite;
            }
          }
          
          // Добавляем сайт в disabledSites если его там еще нет
          if (!disabledSites.includes(siteToDisable)) {
            disabledSites.push(siteToDisable);
          }
          
          // Сохраняем обновленный список disabledSites
          chrome.storage.local.set({ disabledSites: disabledSites }, function() {
            showMessage('Доступ к сайту разрешен! Перенаправление...', 'success');
            
            // Переходим на оригинальный URL через короткую задержку
            setTimeout(() => {
              window.location.href = blockedUrl;
            }, 1000);
          });
        });
      } else {
        showMessage('Неверный пароль', 'error');
        passwordInput.value = '';
        passwordInput.focus();
      }
    });
  }

  function showMessage(text, type) {
    messageElement.textContent = text;
    messageElement.className = `message ${type}`;
  }
});