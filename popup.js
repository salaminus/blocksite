document.addEventListener('DOMContentLoaded', function() {
  const statusText = document.getElementById('statusText');
  const toggleButton = document.getElementById('toggleBlocking');
  const openOptionsButton = document.getElementById('openOptions');
  const blockedCountElement = document.getElementById('blockedCount');
  const disabledCountElement = document.getElementById('disabledCount');

  // Загрузка состояния и статистики
  loadStats();
  
  // Переключение блокировки
  toggleButton.addEventListener('click', function() {
    chrome.storage.local.get(['blockingEnabled'], function(result) {
      const currentState = result.blockingEnabled !== false;
      
      if (currentState) {
        // Если пытаемся выключить блокировку - запрашиваем пароль
        showPasswordPromptForDisable();
      } else {
        // Включение блокировки без пароля
        chrome.storage.local.set({ blockingEnabled: true }, function() {
          updateToggleButton(true);
          loadStats();
        });
      }
    });
  });

  // Открытие настроек
  openOptionsButton.addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });

  // Загрузка статистики
function loadStats() {
    chrome.storage.local.get(['blockingEnabled', 'blockedSites', 'disabledSites'], function(result) {
        const isEnabled = result.blockingEnabled !== false;
        const blockedSites = result.blockedSites || [];
        const disabledSites = result.disabledSites || [];
        
        updateToggleButton(isEnabled);
        
        // Обновляем счетчики
        blockedCountElement.textContent = blockedSites.length;
        disabledCountElement.textContent = disabledSites.length;
        
        // Обновляем статус
        statusText.textContent = isEnabled ? 'Блокировка активна' : 'Блокировка отключена';
        
        // Отладочная информация
        console.log('Popup - Заблокированные:', blockedSites);
        console.log('Popup - Временно разрешенные:', disabledSites);
    });
}

  function updateToggleButton(isEnabled) {
    if (isEnabled) {
      toggleButton.textContent = 'Выключить блокировку';
      toggleButton.classList.add('btn-danger');
      toggleButton.classList.remove('btn-primary');
    } else {
      toggleButton.textContent = 'Включить блокировку';
      toggleButton.classList.add('btn-primary');
      toggleButton.classList.remove('btn-danger');
    }
  }

  function showPasswordPromptForDisable() {
    const password = prompt('Введите пароль для отключения блокировки:');
    if (password !== null) {
      chrome.storage.local.get(['password'], function(result) {
        if (result.password === password) {
          chrome.storage.local.set({ blockingEnabled: false }, function() {
            updateToggleButton(false);
            loadStats();
          });
        } else {
          alert('Неверный пароль! Блокировка остается активной.');
        }
      });
    }
  }

  function showTempMessage(text, type) {
    const message = document.createElement('div');
    message.textContent = text;
    message.className = `temp-message ${type}`;
    message.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 10px 15px;
      border-radius: 4px;
      color: white;
      font-weight: bold;
      z-index: 10000;
      ${type === 'success' ? 'background: #27ae60;' : 'background: #e74c3c;'}
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
      if (document.body.contains(message)) {
        document.body.removeChild(message);
      }
    }, 3000);
  }
});