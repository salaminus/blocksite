document.addEventListener('DOMContentLoaded', function() {
  const blockingStatusElement = document.getElementById('blockingStatus');
  const toggleBlockingOptionsButton = document.getElementById('toggleBlockingOptions');
  const totalBlockedElement = document.getElementById('totalBlocked');
  const totalDisabledElement = document.getElementById('totalDisabled');
  
  const currentPasswordInput = document.getElementById('currentPassword');
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const changePasswordButton = document.getElementById('changePassword');
  const passwordMessage = document.getElementById('passwordMessage');
  
  const newSiteInput = document.getElementById('newSite');
  const addNewSiteButton = document.getElementById('addNewSite');
  const sitesList = document.getElementById('sitesList');
  const siteSearchInput = document.getElementById('siteSearch');
  
  const exportSettingsButton = document.getElementById('exportSettings');
  const importSettingsButton = document.getElementById('importSettings');
  const importFileInput = document.getElementById('importFile');
  
  const enableAllButton = document.getElementById('enableAll');
  const disableAllButton = document.getElementById('disableAll');

  // Загрузка состояния блокировки
  loadBlockingStatus();
  
  // Загрузка списка сайтов
  loadSitesList();

  // Поиск сайтов
  siteSearchInput.addEventListener('input', function() {
    filterSites(this.value);
  });

  // Переключение блокировки в настройках
  toggleBlockingOptionsButton.addEventListener('click', function() {
    chrome.storage.local.get(['blockingEnabled'], function(result) {
      const currentState = result.blockingEnabled !== false;
      
      if (currentState) {
        showPasswordPromptForDisable();
      } else {
        chrome.storage.local.set({ blockingEnabled: true }, function() {
          loadBlockingStatus();
        });
      }
    });
  });

  // Смена пароля
  changePasswordButton.addEventListener('click', function() {
    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      showMessage('Заполните все поля', 'error');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showMessage('Новые пароли не совпадают', 'error');
      return;
    }
    
    chrome.storage.local.get(['password'], function(result) {
      if (result.password === currentPassword) {
        chrome.storage.local.set({ password: newPassword }, function() {
          showMessage('Пароль успешно изменен', 'success');
          currentPasswordInput.value = '';
          newPasswordInput.value = '';
          confirmPasswordInput.value = '';
        });
      } else {
        showMessage('Неверный текущий пароль', 'error');
      }
    });
  });

  // Добавление нового сайта
  addNewSiteButton.addEventListener('click', function() {
    const site = newSiteInput.value.trim();
    if (site) {
      showPasswordPromptForAddition(site);
    }
  });

  newSiteInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      const site = newSiteInput.value.trim();
      if (site) {
        showPasswordPromptForAddition(site);
      }
    }
  });

  // Включить все сайты
  enableAllButton.addEventListener('click', function() {
    showPasswordPromptForEnableAll();
  });

  // Выключить все сайты
  disableAllButton.addEventListener('click', function() {
    showPasswordPromptForDisableAll();
  });

  // Экспорт настроек
  exportSettingsButton.addEventListener('click', function() {
    showPasswordPromptForExport();
  });

  // Импорт настроек
  importSettingsButton.addEventListener('click', function() {
    showPasswordPromptForImport();
  });

  importFileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const settings = JSON.parse(e.target.result);
          if (settings.blockedSites) {
            chrome.storage.local.set({ 
              blockedSites: settings.blockedSites,
              disabledSites: [] // Сбрасываем отключенные сайты при импорте
            }, function() {
              showMessage('Настройки успешно импортированы', 'success');
              loadSitesList();
            });
          }
        } catch (error) {
          showMessage('Ошибка при импорте файла', 'error');
        }
      };
      reader.readAsText(file);
    }
  });

  function loadBlockingStatus() {
    chrome.storage.local.get(['blockingEnabled'], function(result) {
      const isEnabled = result.blockingEnabled !== false;
      
      if (isEnabled) {
        blockingStatusElement.textContent = 'Активна';
        blockingStatusElement.className = 'status-enabled';
        toggleBlockingOptionsButton.textContent = 'Выключить блокировку';
        toggleBlockingOptionsButton.classList.add('btn-danger');
        toggleBlockingOptionsButton.classList.remove('btn-primary');
      } else {
        blockingStatusElement.textContent = 'Отключена';
        blockingStatusElement.className = 'status-disabled';
        toggleBlockingOptionsButton.textContent = 'Включить блокировку';
        toggleBlockingOptionsButton.classList.add('btn-primary');
        toggleBlockingOptionsButton.classList.remove('btn-danger');
      }
    });
  }

  function showPasswordPromptForAddition(site) {
    const password = prompt('Введите пароль для добавления сайта в блокировку:');
    if (password !== null) {
      chrome.storage.local.get(['password'], function(result) {
        if (result.password === password) {
          addSiteToBlockList(site);
          newSiteInput.value = '';
        } else {
          alert('Неверный пароль! Сайт не добавлен.');
        }
      });
    }
  }

  function addSiteToBlockList(site) {
    chrome.storage.local.get(['blockedSites'], function(result) {
      const blockedSites = result.blockedSites || [];
      if (!blockedSites.includes(site)) {
        blockedSites.push(site);
        chrome.storage.local.set({ blockedSites: blockedSites }, function() {
          loadSitesList();
          showMessage('Сайт добавлен в блокировку', 'success');
        });
      } else {
        showMessage('Сайт уже в списке блокировки', 'error');
      }
    });
  }

  function loadSitesList() {
    chrome.storage.local.get(['blockedSites', 'disabledSites'], function(result) {
      const blockedSites = result.blockedSites || [];
      const disabledSites = result.disabledSites || [];
      
      updateStats(blockedSites.length, disabledSites.length);
      renderSitesList(blockedSites, disabledSites);
    });
  }

  function renderSitesList(blockedSites, disabledSites, searchTerm = '') {
    sitesList.innerHTML = '';
    
    if (blockedSites.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'Нет заблокированных сайтов';
      li.className = 'empty';
      sitesList.appendChild(li);
    } else {
      const filteredSites = blockedSites.filter(site => 
        site.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      if (filteredSites.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'Сайты не найдены';
        li.className = 'empty';
        sitesList.appendChild(li);
      } else {
        filteredSites.forEach(site => {
          const isDisabled = disabledSites.includes(site);
          const li = document.createElement('li');
          li.className = isDisabled ? 'site-disabled' : 'site-enabled';
          
          // Переключатель
          const toggle = document.createElement('input');
          toggle.type = 'checkbox';
          toggle.checked = !isDisabled;
          toggle.className = 'site-toggle';
          toggle.addEventListener('change', function() {
            if (this.checked) {
              // Включение блокировки - без пароля
              toggleSiteBlocking(site, true);
            } else {
              // Выключение блокировки - с паролем
              showPasswordPromptForToggle(site, false);
            }
          });
          
          // Название сайта
          const siteName = document.createElement('span');
          siteName.textContent = site;
          siteName.className = 'site-name';
          
          // Статус
          const status = document.createElement('span');
          status.textContent = isDisabled ? ' (разрешён)' : ' (заблокирован)';
          status.className = isDisabled ? 'status-allowed' : 'status-blocked';
          status.style.fontSize = '12px';
          status.style.marginLeft = '8px';
          
          // Кнопка удаления
          const removeBtn = document.createElement('button');
          removeBtn.textContent = 'Удалить';
          removeBtn.className = 'btn btn-small btn-danger';
          removeBtn.addEventListener('click', function() {
            showPasswordPromptForRemoval(site);
          });
          
          li.appendChild(toggle);
          li.appendChild(siteName);
          li.appendChild(status);
          li.appendChild(removeBtn);
          sitesList.appendChild(li);
        });
      }
    }
  }

  function filterSites(searchTerm) {
    chrome.storage.local.get(['blockedSites', 'disabledSites'], function(result) {
      renderSitesList(result.blockedSites || [], result.disabledSites || [], searchTerm);
    });
  }

  function updateStats(totalBlocked, totalDisabled) {
    totalBlockedElement.textContent = totalBlocked;
    totalDisabledElement.textContent = totalDisabled;
  }

  function showPasswordPromptForToggle(site, enabled) {
    const action = enabled ? 'включения' : 'выключения';
    const password = prompt(`Введите пароль для ${action} блокировки сайта ${site}:`);
    if (password !== null) {
      chrome.storage.local.get(['password'], function(result) {
        if (result.password === password) {
          toggleSiteBlocking(site, enabled);
        } else {
          alert('Неверный пароль! Действие отменено.');
          loadSitesList(); // Перезагружаем чтобы сбросить переключатель
        }
      });
    } else {
      loadSitesList(); // Перезагружаем если пользователь отменил ввод
    }
  }

// Исправленная функция toggleSiteBlocking
function toggleSiteBlocking(site, enabled) {
    chrome.storage.local.get(['disabledSites'], function(result) {
        let disabledSites = result.disabledSites || [];
        
        if (enabled) {
            // Включаем блокировку - удаляем ТОЧНОЕ совпадение из disabledSites
            disabledSites = disabledSites.filter(disabledSite => disabledSite !== site);
        } else {
            // Выключаем блокировку - добавляем в disabledSites если еще нет
            if (!disabledSites.includes(site)) {
                disabledSites.push(site);
            }
        }
        
        console.log(`Сайт ${site} - ${enabled ? 'включен' : 'выключен'}`);
        console.log('Новый список disabledSites:', disabledSites);
        
        chrome.storage.local.set({ disabledSites: disabledSites }, function() {
            loadSitesList();
            showMessage(
                enabled ? `Блокировка ${site} включена` : `Блокировка ${site} отключена`, 
                'success'
            );
            
            // Обновляем все вкладки чтобы применить изменения
            updateAllTabs();
        });
    });
}

// Исправленная функция showPasswordPromptForDisableAll
function showPasswordPromptForDisableAll() {
    const password = prompt('Введите пароль для выключения блокировки всех сайтов:');
    if (password !== null) {
        chrome.storage.local.get(['password', 'blockedSites'], function(result) {
            if (result.password === password) {
                const blockedSites = result.blockedSites || [];
                // Копируем ВСЕ заблокированные сайты в disabledSites
                const allSitesToDisable = [...blockedSites];
                
                console.log('Отключаем ВСЕ сайты:', allSitesToDisable);
                chrome.storage.local.set({ disabledSites: allSitesToDisable }, function() {
                    loadSitesList();
                    showMessage('Блокировка всех сайтов выключена', 'success');
                    
                    // Обновляем все вкладки чтобы применить изменения
                    updateAllTabs();
                });
            } else {
                alert('Неверный пароль! Действие отменено.');
            }
        });
    }
}

// Новая функция для обновления всех вкладок
function updateAllTabs() {
    chrome.tabs.query({}, function(tabs) {
        tabs.forEach(function(tab) {
            if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.includes('blocked.html')) {
                chrome.tabs.reload(tab.id);
            }
        });
    });
}

// Исправленная функция showPasswordPromptForEnableAll
function showPasswordPromptForEnableAll() {
    const password = prompt('Введите пароль для включения блокировки всех сайтов:');
    if (password !== null) {
        chrome.storage.local.get(['password'], function(result) {
            if (result.password === password) {
                // Очищаем список отключенных сайтов - ВКЛЮЧАЕМ ВСЕ
                chrome.storage.local.set({ disabledSites: [] }, function() {
                    loadSitesList();
                    showMessage('Блокировка всех сайтов включена', 'success');
                    
                    // Обновляем все вкладки чтобы применить изменения
                    updateAllTabs();
                });
            } else {
                alert('Неверный пароль! Действие отменено.');
            }
        });
    }
}

  function showPasswordPromptForEnableAll() {
    const password = prompt('Введите пароль для включения блокировки всех сайтов:');
    if (password !== null) {
      chrome.storage.local.get(['password'], function(result) {
        if (result.password === password) {
          // Очищаем список отключенных сайтов
          chrome.storage.local.set({ disabledSites: [] }, function() {
            loadSitesList();
            showMessage('Блокировка всех сайтов включена', 'success');
          });
        } else {
          alert('Неверный пароль! Действие отменено.');
        }
      });
    }
  }

  function showPasswordPromptForDisableAll() {
    const password = prompt('Введите пароль для выключения блокировки всех сайтов:');
    if (password !== null) {
      chrome.storage.local.get(['password', 'blockedSites'], function(result) {
        if (result.password === password) {
          const blockedSites = result.blockedSites || [];
          // Добавляем ВСЕ сайты в отключенные
          chrome.storage.local.set({ disabledSites: [...blockedSites] }, function() {
            loadSitesList();
            showMessage('Блокировка всех сайтов выключена', 'success');
          });
        } else {
          alert('Неверный пароль! Действие отменено.');
        }
      });
    }
  }

  function showPasswordPromptForDisable() {
    const password = prompt('Введите пароль для отключения блокировки:');
    if (password !== null) {
      chrome.storage.local.get(['password'], function(result) {
        if (result.password === password) {
          chrome.storage.local.set({ blockingEnabled: false }, function() {
            loadBlockingStatus();
            loadSitesList();
          });
        } else {
          alert('Неверный пароль! Блокировка остается активной.');
        }
      });
    }
  }

  function showPasswordPromptForRemoval(site) {
    const password = prompt('Введите пароль для удаления сайта из списка заблокированных:');
    if (password !== null) {
      chrome.storage.local.get(['password'], function(result) {
        if (result.password === password) {
          removeSiteFromBlockList(site);
        } else {
          alert('Неверный пароль!');
        }
      });
    }
  }

  function removeSiteFromBlockList(site) {
    chrome.storage.local.get(['blockedSites', 'disabledSites'], function(result) {
      const blockedSites = result.blockedSites || [];
      const disabledSites = result.disabledSites || [];
      
      const index = blockedSites.indexOf(site);
      if (index > -1) {
        blockedSites.splice(index, 1);
        const disabledIndex = disabledSites.indexOf(site);
        if (disabledIndex > -1) {
          disabledSites.splice(disabledIndex, 1);
        }
        
        chrome.storage.local.set({ 
          blockedSites: blockedSites,
          disabledSites: disabledSites 
        }, function() {
          loadSitesList();
          showMessage('Сайт удален из блокировки', 'success');
        });
      }
    });
  }

  function showPasswordPromptForExport() {
    const password = prompt('Введите пароль для экспорта настроек:');
    if (password !== null) {
      chrome.storage.local.get(['password'], function(result) {
        if (result.password === password) {
          performExport();
        } else {
          alert('Неверный пароль!');
        }
      });
    }
  }

  function showPasswordPromptForImport() {
    const password = prompt('Введите пароль для импорта настроек:');
    if (password !== null) {
      chrome.storage.local.get(['password'], function(result) {
        if (result.password === password) {
          importFileInput.click();
        } else {
          alert('Неверный пароль!');
        }
      });
    }
  }

  function performExport() {
    chrome.storage.local.get(['blockedSites', 'disabledSites'], function(result) {
      const settings = {
        blockedSites: result.blockedSites,
        disabledSites: result.disabledSites,
        exportedAt: new Date().toISOString()
      };
      
      const dataStr = JSON.stringify(settings, null, 2);
      const dataBlob = new Blob([dataStr], {type: 'application/json'});
      
      const url = URL.createObjectURL(dataBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = 'site-blocker-settings.json';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
    });
  }

  function showMessage(text, type) {
    passwordMessage.textContent = text;
    passwordMessage.className = `message ${type}`;
    setTimeout(() => {
      passwordMessage.textContent = '';
      passwordMessage.className = 'message';
    }, 3000);
  }


function showPasswordPromptForDisableAll() {
    const password = prompt('Введите пароль для выключения блокировки всех сайтов:');
    if (password !== null) {
        chrome.storage.local.get(['password', 'blockedSites'], function(result) {
            if (result.password === password) {
                const blockedSites = result.blockedSites || [];
                // Создаем копию массива заблокированных сайтов
                const allSitesToDisable = [...blockedSites];
                
                console.log('Отключаем все сайты:', allSitesToDisable);
                chrome.storage.local.set({ disabledSites: allSitesToDisable }, function() {
                    // Проверяем сохранение
                    chrome.storage.local.get(['disabledSites'], function(checkResult) {
                        console.log('Проверка - отключенные сайты:', checkResult.disabledSites);
                        loadSitesList();
                        showMessage('Блокировка всех сайтов выключена', 'success');
                    });
                });
            } else {
                alert('Неверный пароль! Действие отменено.');
            }
        });
    }
}

// Добавьте эту функцию для отладки
function debugStorage() {
    chrome.storage.local.get(['blockedSites', 'disabledSites', 'blockingEnabled'], function(result) {
        console.log('=== ДЕБАГ ХРАНИЛИЩА ===');
        console.log('blockingEnabled:', result.blockingEnabled);
        console.log('blockedSites:', result.blockedSites);
        console.log('disabledSites:', result.disabledSites);
        
        // Проверяем текущий сайт
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                const url = new URL(tabs[0].url);
                const hostname = url.hostname;
                console.log('Текущий сайт:', hostname);
                console.log('Должен быть заблокирован:', isSiteBlocked(hostname, result.blockedSites, result.disabledSites));
            }
        });
    });
}

// Функция для быстрой проверки блокировки
function testBlocking() {
    const testUrl = prompt('Введите URL для проверки (например: youtube.com):');
    if (testUrl) {
        chrome.storage.local.get(['blockedSites', 'disabledSites'], function(result) {
            const hostname = testUrl.replace(/https?:\/\//, '').split('/')[0];
            const isBlocked = isSiteBlockedSimple(hostname, result.blockedSites, result.disabledSites);
            alert(`Сайт ${hostname} - ${isBlocked ? 'ЗАБЛОКИРОВАН' : 'РАЗРЕШЕН'}`);
        });
    }
}

// Упрощенная функция проверки для теста
function isSiteBlockedSimple(hostname, blockedSites, disabledSites) {
    if (!blockedSites || blockedSites.length === 0) return false;
    
    const cleanHostname = hostname.toLowerCase().replace('www.', '');
    
    for (const site of blockedSites) {
        const cleanSite = site.toLowerCase().replace('www.', '');
        if (cleanHostname === cleanSite || 
            cleanHostname.endsWith('.' + cleanSite) || 
            cleanSite.endsWith('.' + cleanHostname)) {
            
            // Проверяем, не отключена ли блокировка
            for (const disabledSite of disabledSites || []) {
                const cleanDisabled = disabledSite.toLowerCase().replace('www.', '');
                if (cleanSite === cleanDisabled) {
                    return false; // Разрешено
                }
            }
            return true; // Заблокировано
        }
    }
    return false;
}
});