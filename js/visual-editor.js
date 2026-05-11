// Визуальный редактор сайта

class VisualEditor {
  constructor() {
    this.editMode = true;
    this.currentElement = null;
    this.currentSection = null;
    this.currentElementSelector = null;
    this.styles = {};
    this.isDragging = false;
    this.isMovingElement = false;
    this.dragType = null;
    this.dragStart = { x: 0, y: 0 };
    this.moveStart = { x: 0, y: 0 };
    this.selectionListeners = null;
    this.hoveredElement = null;
    this.hoverTarget = null;
    this.hoverRafId = null;
    
    this.init();
  }

  init() {
    this.loadSavedStyles();
    this.setupEventListeners();
    this.setupIframe();
    this.setupDragHandles();
  }

  setupEventListeners() {
    // Переключение режима редактирования
    document.getElementById('editMode').addEventListener('change', (e) => {
      this.editMode = e.target.checked;
      this.toggleEditMode();
    });

    // Выбор раздела
    document.getElementById('sectionSelector').addEventListener('change', (e) => {
      this.selectSection(e.target.value);
    });

    // Шрифты
    document.getElementById('fontFamily').addEventListener('change', (e) => {
      this.applyFontFamily(e.target.value);
    });

    document.getElementById('fontSize').addEventListener('input', (e) => {
      document.getElementById('fontSizeValue').textContent = e.target.value + 'px';
      this.applyFontSize(e.target.value + 'px');
    });

    document.getElementById('fontWeight').addEventListener('input', (e) => {
      document.getElementById('fontWeightValue').textContent = e.target.value;
      this.applyFontWeight(e.target.value);
    });

    // Отступы
    ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'].forEach(prop => {
      document.getElementById(prop).addEventListener('input', (e) => {
        this.applyPadding(prop, e.target.value + 'px');
      });
    });

    // Цвета
    document.getElementById('textColor').addEventListener('input', (e) => {
      this.applyTextColor(e.target.value);
    });

    document.getElementById('backgroundColor').addEventListener('input', (e) => {
      this.applyBackgroundColor(e.target.value);
    });

    // Кнопки действий
    document.getElementById('resetStyles').addEventListener('click', () => {
      this.resetStyles();
    });

    document.getElementById('exportCSS').addEventListener('click', () => {
      this.exportCSS();
    });

    document.getElementById('saveStyles').addEventListener('click', () => {
      this.saveStyles();
    });

    // Панель управления
    document.getElementById('togglePanel').addEventListener('click', () => {
      this.togglePanel();
    });

    // Обновление предпросмотра
    document.getElementById('refreshPreview').addEventListener('click', () => {
      this.refreshPreview();
    });

    // Полный экран
    document.getElementById('fullscreen').addEventListener('click', () => {
      this.toggleFullscreen();
    });

    // Тест подключения
    const testBtn = document.getElementById('testConnection');
    if (testBtn) {
      testBtn.addEventListener('click', () => {
        this.testConnection();
      });
    }
  }

  testConnection() {
    const iframe = document.getElementById('sitePreview');
    if (!iframe) {
      alert('❌ Iframe не найден');
      return;
    }

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    const iframeWindow = iframe.contentWindow;
    
    let message = 'Тест подключения:\n\n';
    
    if (!iframeDoc) {
      message += '❌ Нет доступа к документу iframe (CORS)\n';
      message += 'Запустите через локальный сервер: node server.js';
      alert(message);
      return;
    }
    
    message += '✓ Доступ к документу iframe есть\n';
    
    if (!iframeWindow.visualEditor) {
      message += '❌ VisualEditor не инициализирован\n';
      message += 'Попытка инициализации...';
      alert(message);
      this.injectEditorScript(iframe);
      setTimeout(() => this.testConnection(), 500);
      return;
    }
    
    message += '✓ VisualEditor инициализирован\n';
    
    // Тест поиска элементов
    const testSections = ['header', 'hero', 'services'];
    message += '\nТест поиска разделов:\n';
    testSections.forEach(section => {
      const element = iframeWindow.visualEditor.findElement(section);
      message += element ? `✓ ${section} найден\n` : `✗ ${section} не найден\n`;
    });
    
    alert(message);
  }

  setupIframe() {
    const iframe = document.getElementById('sitePreview');
    const errorDiv = document.getElementById('iframeError');
    
    if (!iframe) {
      console.error('Iframe не найден!');
      return;
    }
    
    // Проверка загрузки через таймаут
    const loadTimeout = setTimeout(() => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (!iframeDoc || iframeDoc.readyState !== 'complete') {
          iframe.style.display = 'none';
          if (errorDiv) errorDiv.style.display = 'block';
        }
      } catch (e) {
        iframe.style.display = 'none';
        if (errorDiv) errorDiv.style.display = 'block';
      }
    }, 5000);
    
    const handleLoad = () => {
      clearTimeout(loadTimeout);
      console.log('Iframe загружен, инициализация редактора...');
      
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (!iframeDoc) {
          throw new Error('Не удалось получить доступ к документу iframe');
        }
        
        // Ждем полной загрузки DOM
        if (iframeDoc.readyState === 'loading') {
          iframeDoc.addEventListener('DOMContentLoaded', () => {
            this.initializeEditor(iframe, errorDiv);
          });
        } else {
          this.initializeEditor(iframe, errorDiv);
        }
      } catch (e) {
        console.error('Ошибка доступа к iframe:', e);
        iframe.style.display = 'none';
        if (errorDiv) {
          errorDiv.style.display = 'block';
          this.showEditorError(errorDiv, '⚠️ Ошибка доступа к iframe (CORS)', [
            'Запустите локальный сервер:',
            'node server.js',
            'Затем откройте: http://localhost:3000/visual-editor.html',
          ]);
        }
      }
    };
    
    iframe.addEventListener('load', handleLoad);
    
    // Если iframe уже загружен
    if (iframe.complete) {
      handleLoad();
    }

    // Обработка ошибок загрузки
    iframe.addEventListener('error', () => {
      clearTimeout(loadTimeout);
      console.error('Ошибка загрузки iframe');
      iframe.style.display = 'none';
      if (errorDiv) {
        errorDiv.style.display = 'block';
        this.showEditorError(errorDiv, '⚠️ Не удалось загрузить сайт', [
          'Проверьте путь к index.html или запустите локальный сервер',
        ]);
      }
    });
  }

  showEditorError(container, title, lines) {
    const titleElement = document.createElement('p');
    titleElement.textContent = title;

    const detail = document.createElement('p');
    detail.style.fontSize = '12px';
    detail.style.marginTop = '10px';

    lines.forEach((line, index) => {
      if (index > 0) detail.appendChild(document.createElement('br'));

      if (/^(node|https?:)/.test(line)) {
        const code = document.createElement('code');
        code.textContent = line;
        code.style.cssText = 'background: #2a2a2a; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 8px;';
        detail.appendChild(code);
      } else {
        detail.appendChild(document.createTextNode(line));
      }
    });

    container.replaceChildren(titleElement, detail);
  }

  initializeEditor(iframe, errorDiv) {
    try {
      this.cleanupElementSelection();
      this.injectEditorScript(iframe);
      this.loadStylesToIframe(iframe);
      if (this.editMode) {
        this.toggleEditMode();
      }
      if (errorDiv) errorDiv.style.display = 'none';
      iframe.style.display = 'block';
      console.log('Редактор инициализирован успешно');
    } catch (e) {
      console.error('Ошибка инициализации редактора:', e);
    }
  }

  injectEditorScript(iframe) {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      const iframeWindow = iframe.contentWindow;
      
      if (!iframeDoc) {
        console.error('Не удалось получить доступ к документу iframe');
        return false;
      }
      
      // Проверяем, не инжектили ли уже скрипт
      if (iframeWindow.visualEditor) {
        console.log('Скрипт редактора уже загружен');
        return true;
      }
      
      // Инжектим скрипт для взаимодействия с элементами
      const script = iframeDoc.createElement('script');
      script.textContent = `
      (function() {
        window.visualEditor = {
          selectElement: function(sectionId) {
            const element = this.findElement(sectionId);
            if (element) {
              // Убираем предыдущее выделение
              document.querySelectorAll('.visual-editor-highlight').forEach(el => {
                el.classList.remove('visual-editor-highlight');
              });
              
              element.classList.add('visual-editor-highlight');
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              return element;
            }
            return null;
          },
          
          applyStyle: function(sectionId, property, value) {
            const element = this.findElement(sectionId);
            if (element) {
              element.style[property] = value;
              return true;
            }
            return false;
          },
          
          applyStyleToElement: function(element, property, value) {
            if (element) {
              console.log('Применяю стиль к элементу в iframe:', element, property, '=', value);
              element.style[property] = value;
              console.log('Стиль применен, текущее значение:', element.style[property]);
              return true;
            }
            console.warn('Элемент не найден для применения стиля');
            return false;
          },
          
          selectElementByClick: function(element) {
            if (!element) return null;
            
            // Убираем предыдущее выделение
            document.querySelectorAll('.visual-editor-highlight').forEach(el => {
              el.classList.remove('visual-editor-highlight');
            });
            
            element.classList.add('visual-editor-highlight');
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return element;
          },
          
          getElementSelector: function(element) {
            if (!element) return null;
            if (element.id) return '#' + element.id;
            if (element.className) {
              const classes = element.className.split(' ').filter(c => c && !c.startsWith('visual-editor'));
              if (classes.length > 0) {
                return '.' + classes[0];
              }
            }
            return element.tagName.toLowerCase();
          },
          
          getSectionSelector: function(sectionId) {
            const selectors = {
              'header': ['header.site-header', '.site-header', 'header'],
              'hero': ['section.hero', '.hero', '#hero-reel-container'],
              'about': ['#about', '.about-section', 'section[id*="about"]'],
              'benefits': ['section#benefits', '#benefits', '.benefits-section'],
              'services': ['section#services', '#services', '.services'],
              'works': ['#works', '.works-section', 'section[id*="work"]'],
              'footer': ['footer', '.site-footer', '.footer']
            };
            return selectors[sectionId] || [sectionId];
          },
          
          findElement: function(sectionId) {
            const selectors = this.getSectionSelector(sectionId);
            for (let selector of selectors) {
              try {
                const element = document.querySelector(selector);
                if (element) {
                  return element;
                }
              } catch (e) {
                console.warn('Ошибка селектора:', selector, e);
              }
            }
            return null;
          }
        };
        console.log('Visual Editor скрипт загружен в iframe');
      })();
    `;
    
    iframeDoc.head.appendChild(script);
    console.log('Скрипт редактора инжектирован');

    // Добавляем стили для выделения
    const style = iframeDoc.createElement('style');
    style.textContent = `
      .visual-editor-highlight {
        outline: 3px solid #7e63ff !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 20px rgba(126, 99, 255, 0.5) !important;
        position: relative !important;
      }
      
      .visual-editor-highlight::before {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        border: 2px dashed #7e63ff;
        pointer-events: none;
        z-index: 9999;
      }
    `;
    iframeDoc.head.appendChild(style);
    console.log('Стили редактора добавлены');
    return true;
    } catch (e) {
      console.error('Ошибка при инжекте скрипта в iframe:', e);
      return false;
    }
  }

  selectSection(sectionId) {
    if (!sectionId) {
      this.currentSection = null;
      this.currentElement = null;
      const iframe = document.getElementById('sitePreview');
      if (iframe) {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        if (iframeDoc) {
          iframeDoc.querySelectorAll('.visual-editor-resize-handle').forEach(h => h.remove());
          iframeDoc.querySelectorAll('.visual-editor-highlight').forEach(el => {
            el.classList.remove('visual-editor-highlight');
          });
        }
      }
      const statusDiv = document.getElementById('sectionStatus');
      if (statusDiv) statusDiv.textContent = '';
      return;
    }

    this.currentSection = sectionId;
    const iframe = document.getElementById('sitePreview');
    if (!iframe) {
      console.error('Iframe не найден');
      return;
    }
    
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    const iframeWindow = iframe.contentWindow;
    const statusDiv = document.getElementById('sectionStatus');
    
    if (!iframeDoc) {
      if (statusDiv) {
        statusDiv.textContent = '✗ Нет доступа к iframe';
        statusDiv.style.color = '#ff6b6b';
      }
      console.error('Нет доступа к документу iframe');
      return;
    }
    
    if (!iframeWindow.visualEditor) {
      if (statusDiv) {
        statusDiv.textContent = '⏳ Инициализация...';
        statusDiv.style.color = '#ff9b4a';
      }
      // Пытаемся инжектить скрипт снова
      setTimeout(() => {
        this.injectEditorScript(iframe);
        this.selectSection(sectionId);
      }, 500);
      return;
    }
    
    try {
      const element = iframeWindow.visualEditor.selectElement(sectionId);
      
      if (element) {
        this.currentElement = element;
        // Загружаем стили с учетом контекста iframe
        const computed = iframeWindow.getComputedStyle(element);
        this.loadElementStylesFromComputed(computed);
        
        if (statusDiv) {
          statusDiv.textContent = '✓ Раздел выбран';
          statusDiv.style.color = '#33f5c8';
        }
        
        // Показываем ручки для изменения размеров
        if (this.editMode) {
          setTimeout(() => {
            this.showResizeHandles(element);
          }, 100);
        }
      } else {
        console.error('Элемент не найден для секции:', sectionId);
        if (statusDiv) {
          statusDiv.textContent = '✗ Раздел не найден';
          statusDiv.style.color = '#ff6b6b';
        }
      }
    } catch (e) {
      console.error('Ошибка при выборе раздела:', e);
      if (statusDiv) {
        statusDiv.textContent = '✗ Ошибка: ' + e.message;
        statusDiv.style.color = '#ff6b6b';
      }
    }
  }

  loadElementStylesFromComputed(computed) {
    if (!computed) return;
    
    // Загружаем текущие значения в панель
    const fontSize = parseInt(computed.fontSize);
    const fontWeight = parseInt(computed.fontWeight);
    
    if (fontSize && !isNaN(fontSize)) {
      document.getElementById('fontSize').value = fontSize;
      document.getElementById('fontSizeValue').textContent = fontSize + 'px';
    }
    
    if (fontWeight && !isNaN(fontWeight)) {
      document.getElementById('fontWeight').value = fontWeight;
      document.getElementById('fontWeightValue').textContent = fontWeight;
    }

    // Отступы
    const paddingTop = parseInt(computed.paddingTop);
    const paddingBottom = parseInt(computed.paddingBottom);
    const paddingLeft = parseInt(computed.paddingLeft);
    const paddingRight = parseInt(computed.paddingRight);

    if (paddingTop && !isNaN(paddingTop)) document.getElementById('paddingTop').value = paddingTop;
    if (paddingBottom && !isNaN(paddingBottom)) document.getElementById('paddingBottom').value = paddingBottom;
    if (paddingLeft && !isNaN(paddingLeft)) document.getElementById('paddingLeft').value = paddingLeft;
    if (paddingRight && !isNaN(paddingRight)) document.getElementById('paddingRight').value = paddingRight;

    // Цвета
    const textColor = this.rgbToHex(computed.color);
    const bgColor = this.rgbToHex(computed.backgroundColor);
    if (textColor) document.getElementById('textColor').value = textColor;
    if (bgColor) document.getElementById('backgroundColor').value = bgColor;
  }

  applyFontFamily(fontFamily) {
    if (!this.currentElement && !this.currentSection) return;
    this.applyStyle('fontFamily', fontFamily);
  }

  applyFontSize(fontSize) {
    if (!this.currentElement && !this.currentSection) return;
    this.applyStyle('fontSize', fontSize);
  }

  applyFontWeight(fontWeight) {
    if (!this.currentElement && !this.currentSection) return;
    this.applyStyle('fontWeight', fontWeight);
  }

  applyPadding(property, value) {
    if (!this.currentElement && !this.currentSection) return;
    const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
    this.applyStyle(cssProperty, value);
  }

  applyTextColor(color) {
    if (!this.currentElement && !this.currentSection) return;
    this.applyStyle('color', color);
  }

  applyBackgroundColor(color) {
    if (!this.currentElement && !this.currentSection) return;
    this.applyStyle('backgroundColor', color);
  }

  applyStyle(property, value) {
    const iframe = document.getElementById('sitePreview');
    if (!iframe) {
      console.warn('Iframe не найден');
      return;
    }
    
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    const iframeWindow = iframe.contentWindow;
    
    if (!iframeDoc || !iframeWindow) {
      console.warn('Нет доступа к iframe');
      return;
    }

    if (!iframeWindow.visualEditor) {
      console.warn('VisualEditor не инициализирован в iframe');
      this.injectEditorScript(iframe);
      setTimeout(() => this.applyStyle(property, value), 100);
      return;
    }

    const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
    
    try {
      let success = false;
      let styleKey = null;
      
      // Если выбран конкретный элемент, применяем к нему
      if (this.currentElement) {
        console.log('Применяю стиль к элементу:', this.currentElement, property, '=', value);
        success = iframeWindow.visualEditor.applyStyleToElement(this.currentElement, cssProperty, value);
        styleKey = this.currentElementSelector || iframeWindow.visualEditor.getElementSelector(this.currentElement);
        console.log('Результат применения:', success, 'ключ:', styleKey);
      } 
      // Иначе применяем к секции
      else if (this.currentSection) {
        console.log('Применяю стиль к секции:', this.currentSection, property, '=', value);
        success = iframeWindow.visualEditor.applyStyle(this.currentSection, cssProperty, value);
        styleKey = this.currentSection;
        console.log('Результат применения:', success);
      } else {
        console.warn('Нет выбранного элемента или секции!', {
          hasElement: !!this.currentElement,
          hasSection: !!this.currentSection
        });
      }

      if (success && styleKey) {
        // Сохраняем в объект стилей
        if (!this.styles[styleKey]) {
          this.styles[styleKey] = {};
        }
        this.styles[styleKey][property] = value;
        console.log('Стиль сохранен:', styleKey, property, '=', value);
        this.updateDebugInfo(`Стиль применен: ${property} = ${value}`);
      } else {
        console.error('Не удалось применить стиль:', property, '=', value, {
          success,
          styleKey,
          hasElement: !!this.currentElement,
          hasSection: !!this.currentSection
        });
        this.updateDebugInfo(`Ошибка: не удалось применить ${property}`);
      }
    } catch (e) {
      console.error('Ошибка при применении стиля:', e);
    }
  }

  resetStyles() {
    if (!this.currentSection) return;
    
    if (confirm('Сбросить все изменения для этого раздела?')) {
      const iframe = document.getElementById('sitePreview');
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      
      if (iframeDoc) {
        const element = iframeDoc.defaultView.visualEditor.findElement(this.currentSection);
        
        if (element) {
          element.style.cssText = '';
          const iframeWindow = iframe.contentWindow;
          const computed = iframeWindow.getComputedStyle(element);
          this.loadElementStylesFromComputed(computed);
        }
      }
      
      delete this.styles[this.currentSection];
    }
  }

  exportCSS() {
    if (Object.keys(this.styles).length === 0) {
      alert('Нет изменений для экспорта');
      return;
    }

    let css = '/* Экспортированные стили из визуального редактора */\n\n';
    
    Object.keys(this.styles).forEach(section => {
      const selector = this.getCSSSelector(section);
      css += `${selector} {\n`;
      
      Object.keys(this.styles[section]).forEach(property => {
        const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
        css += `  ${cssProperty}: ${this.styles[section][property]};\n`;
      });
      
      css += '}\n\n';
    });

    // Создаем и скачиваем файл
    const blob = new Blob([css], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'visual-editor-styles.css';
    a.click();
    URL.revokeObjectURL(url);
  }

  getCSSSelector(sectionId) {
    const selectors = {
      'header': 'header.site-header',
      'hero': 'section.hero',
      'about': '#about',
      'benefits': 'section#benefits',
      'services': 'section#services',
      'works': '#works',
      'footer': 'footer'
    };
    return selectors[sectionId] || sectionId;
  }

  saveStyles() {
    localStorage.setItem('visualEditorStyles', JSON.stringify(this.styles));
    this.loadStylesToIframe(document.getElementById('sitePreview'));
    alert('Стили сохранены!');
  }

  loadSavedStyles() {
    const saved = localStorage.getItem('visualEditorStyles');
    if (saved) {
      try {
        this.styles = JSON.parse(saved);
      } catch (e) {
        console.error('Ошибка загрузки сохраненных стилей:', e);
      }
    }
  }

  loadStylesToIframe(iframe) {
    if (!iframe || Object.keys(this.styles).length === 0) return;

    const applyStyles = () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const iframeWindow = iframe.contentWindow;
        if (!iframeDoc || !iframeWindow || !iframeWindow.visualEditor) return;
        
        Object.keys(this.styles).forEach(section => {
          const selector = iframeWindow.visualEditor.getSectionSelector(section);
          const element = iframeDoc.querySelector(selector);
          
          if (element) {
            Object.keys(this.styles[section]).forEach(property => {
              const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
              element.style[cssProperty] = this.styles[section][property];
            });
          }
        });
      } catch (error) {
        console.error('Ошибка применения сохраненных стилей в iframe:', error);
      }
    };

    if (iframe.contentDocument?.readyState === 'complete' && iframe.contentWindow?.visualEditor) {
      applyStyles();
    } else {
      iframe.addEventListener('load', applyStyles, { once: true });
    }
  }

  toggleEditMode() {
    const iframe = document.getElementById('sitePreview');
    if (!iframe) return;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    
    if (!iframeDoc) return;

    if (this.editMode) {
      iframeDoc.body.style.cursor = 'crosshair';
      this.setupElementSelection(iframeDoc);
      
      // Показываем ручки для текущего элемента
      if (this.currentElement) {
        this.showResizeHandles(this.currentElement);
      }
    } else {
      iframeDoc.body.style.cursor = 'default';
      this.cleanupElementSelection();
      iframeDoc.querySelectorAll('.visual-editor-resize-handle').forEach(h => h.remove());
    }
  }

  setupElementSelection(iframeDoc) {
    const iframe = document.getElementById('sitePreview');
    const iframeWindow = iframe?.contentWindow;
    if (!iframeDoc || !iframeWindow) return;

    if (this.selectionListeners?.doc === iframeDoc) {
      return; // уже подключены обработчики для этого документа
    }

    this.cleanupElementSelection();

    const raf = iframeWindow.requestAnimationFrame || window.requestAnimationFrame;
    const cancelRaf = iframeWindow.cancelAnimationFrame || window.cancelAnimationFrame;
    const scheduleHover = (fn) => raf ? raf(fn) : setTimeout(fn, 16);
    const clearHoverFrame = (id) => {
      if (!id) return;
      if (cancelRaf) {
        cancelRaf(id);
      } else {
        clearTimeout(id);
      }
    };

    const onMouseMove = (e) => {
      if (!this.editMode) return;
      
      if (e.target.classList.contains('visual-editor-resize-handle') || 
          e.target.classList.contains('visual-editor-highlight')) {
        return;
      }

      this.hoverTarget = e.target;

      if (this.hoverRafId) return;
      this.hoverRafId = scheduleHover(() => {
        this.hoverRafId = null;
        const element = this.hoverTarget;
        if (!element) return;

        if (this.hoveredElement && this.hoveredElement !== element && !this.hoveredElement.classList.contains('visual-editor-highlight')) {
          this.hoveredElement.style.outline = '';
          this.hoveredElement.style.outlineOffset = '';
        }

        if (element !== this.hoveredElement && !element.classList.contains('visual-editor-highlight')) {
          element.style.outline = '1px dashed rgba(126, 99, 255, 0.5)';
          element.style.outlineOffset = '2px';
          this.hoveredElement = element;
        }
      });
    };
    
    const onClick = (e) => {
      if (!this.editMode) return;
      
      if (e.target.classList.contains('visual-editor-resize-handle')) {
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      const element = e.target;
      
      if (iframeWindow.visualEditor) {
        this.currentElement = iframeWindow.visualEditor.selectElementByClick(element);
        this.currentElementSelector = iframeWindow.visualEditor.getElementSelector(element);
        this.currentSection = null; // Сбрасываем секцию при выборе элемента
        console.log('Элемент выбран:', this.currentElement, 'селектор:', this.currentElementSelector);
      } else {
        this.currentElement = element;
        console.warn('visualEditor не доступен, используем элемент напрямую');
      }
      
      if (this.currentElement) {
        const computed = iframeWindow.getComputedStyle(this.currentElement);
        this.loadElementStylesFromComputed(computed);
        
        setTimeout(() => {
          this.showResizeHandles(this.currentElement);
        }, 50);
        
        const statusDiv = document.getElementById('sectionStatus');
        if (statusDiv) {
          statusDiv.textContent = '✓ Элемент выбран: ' + (this.currentElement.tagName + (this.currentElement.id ? '#' + this.currentElement.id : '') + (this.currentElement.className ? '.' + this.currentElement.className.split(' ')[0] : ''));
          statusDiv.style.color = '#33f5c8';
        }
        
        console.log('Элемент готов к редактированию:', this.currentElement);
        this.updateDebugInfo('Элемент выбран: ' + this.currentElement.tagName);
      } else {
        console.error('Не удалось выбрать элемент');
        this.updateDebugInfo('Ошибка: элемент не выбран');
      }
      
      const section = this.detectSection(element);
      if (section) {
        document.getElementById('sectionSelector').value = section;
      } else {
        document.getElementById('sectionSelector').value = '';
      }
    };
    
    const onMouseLeave = () => {
      if (this.hoveredElement && !this.hoveredElement.classList.contains('visual-editor-highlight')) {
        this.hoveredElement.style.outline = '';
        this.hoveredElement.style.outlineOffset = '';
      }
      this.hoverTarget = null;
      this.hoveredElement = null;
    };

    iframeDoc.addEventListener('mousemove', onMouseMove, { passive: true });
    iframeDoc.addEventListener('click', onClick, true);
    iframeDoc.addEventListener('mouseleave', onMouseLeave);

    this.selectionListeners = {
      doc: iframeDoc,
      mousemove: onMouseMove,
      click: onClick,
      mouseleave: onMouseLeave,
      cancelHover: () => {
        clearHoverFrame(this.hoverRafId);
        this.hoverRafId = null;
        if (this.hoveredElement && !this.hoveredElement.classList.contains('visual-editor-highlight')) {
          this.hoveredElement.style.outline = '';
          this.hoveredElement.style.outlineOffset = '';
        }
        this.hoverTarget = null;
        this.hoveredElement = null;
      }
    };
  }

  cleanupElementSelection() {
    if (!this.selectionListeners) return;

    const { doc, mousemove, click, mouseleave, cancelHover } = this.selectionListeners;

    if (doc && mousemove) doc.removeEventListener('mousemove', mousemove);
    if (doc && click) doc.removeEventListener('click', click, true);
    if (doc && mouseleave) doc.removeEventListener('mouseleave', mouseleave);
    if (typeof cancelHover === 'function') cancelHover();

    this.selectionListeners = null;
  }

  detectSection(element) {
    // Определяем раздел по классам и ID элемента
    const sectionMap = {
      'header': ['header', 'site-header', 'navbar'],
      'hero': ['hero', 'hero-section'],
      'about': ['about'],
      'benefits': ['benefit', 'advantage'],
      'services': ['service'],
      'works': ['work', 'portfolio'],
      'footer': ['footer', 'site-footer']
    };

    const elementClasses = element.className.toLowerCase();
    const elementId = element.id ? element.id.toLowerCase() : '';
    const tagName = element.tagName.toLowerCase();

    for (const [section, keywords] of Object.entries(sectionMap)) {
      for (const keyword of keywords) {
        if (elementClasses.includes(keyword) || elementId.includes(keyword) || tagName === keyword) {
          return section;
        }
      }
    }

    // Проверяем родительские элементы
    let parent = element.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
      const parentClasses = parent.className.toLowerCase();
      const parentId = parent.id ? parent.id.toLowerCase() : '';
      
      for (const [section, keywords] of Object.entries(sectionMap)) {
        for (const keyword of keywords) {
          if (parentClasses.includes(keyword) || parentId.includes(keyword)) {
            return section;
          }
        }
      }
      
      parent = parent.parentElement;
      depth++;
    }

    return null;
  }

  setupDragHandles() {
    const iframe = document.getElementById('sitePreview');
    
    iframe.addEventListener('load', () => {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      this.createResizeHandles(iframeDoc);
    });
  }

  createResizeHandles(iframeDoc) {
    // Создаем ручки для изменения размеров
    const style = iframeDoc.createElement('style');
    style.textContent = `
      .visual-editor-resize-handle {
        position: absolute;
        background: #7e63ff;
        border: 2px solid #fff;
        border-radius: 50%;
        width: 14px;
        height: 14px;
        cursor: pointer;
        z-index: 10000;
        box-shadow: 0 0 10px rgba(126, 99, 255, 0.8), 0 0 20px rgba(126, 99, 255, 0.4);
        transition: all 0.2s;
        pointer-events: auto;
      }
      
      .visual-editor-resize-handle:hover {
        transform: scale(1.4);
        box-shadow: 0 0 15px rgba(126, 99, 255, 1), 0 0 30px rgba(126, 99, 255, 0.6);
        background: #9d85ff;
      }
      
      .visual-editor-resize-handle.top {
        top: -7px;
        left: 50%;
        transform: translateX(-50%);
        cursor: ns-resize;
      }
      
      .visual-editor-resize-handle.bottom {
        bottom: -7px;
        left: 50%;
        transform: translateX(-50%);
        cursor: ns-resize;
      }
      
      .visual-editor-resize-handle.left {
        left: -7px;
        top: 50%;
        transform: translateY(-50%);
        cursor: ew-resize;
      }
      
      .visual-editor-resize-handle.right {
        right: -7px;
        top: 50%;
        transform: translateY(-50%);
        cursor: ew-resize;
      }
      
      .visual-editor-resize-handle.corner {
        width: 18px;
        height: 18px;
      }
      
      .visual-editor-resize-handle.top-left {
        top: -9px;
        left: -9px;
        cursor: nwse-resize;
      }
      
      .visual-editor-resize-handle.top-right {
        top: -9px;
        right: -9px;
        cursor: nesw-resize;
      }
      
      .visual-editor-resize-handle.bottom-left {
        bottom: -9px;
        left: -9px;
        cursor: nesw-resize;
      }
      
      .visual-editor-resize-handle.bottom-right {
        bottom: -9px;
        right: -9px;
        cursor: nwse-resize;
      }
      
      .visual-editor-resize-handle.move-handle {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 20px;
        height: 20px;
        background: #33f5c8;
        border: 2px solid #fff;
        border-radius: 50%;
        cursor: move;
        z-index: 10001;
        box-shadow: 0 0 10px rgba(51, 245, 200, 0.8), 0 0 20px rgba(51, 245, 200, 0.4);
        transition: all 0.2s;
      }
      
      .visual-editor-resize-handle.move-handle:hover {
        transform: translate(-50%, -50%) scale(1.3);
        box-shadow: 0 0 15px rgba(51, 245, 200, 1), 0 0 30px rgba(51, 245, 200, 0.6);
        background: #4affd0;
      }
    `;
    iframeDoc.head.appendChild(style);
  }

  showResizeHandles(element) {
    if (!element) return;
    
    const iframe = document.getElementById('sitePreview');
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    const iframeWindow = iframe.contentWindow;
    if (!iframeDoc || !iframeWindow) return;

    // Убираем старые ручки
    iframeDoc.querySelectorAll('.visual-editor-resize-handle').forEach(h => h.remove());

    // Используем абсолютное позиционирование относительно элемента
    const positions = [
      { class: 'top', type: 'resize' },
      { class: 'bottom', type: 'resize' },
      { class: 'left', type: 'resize' },
      { class: 'right', type: 'resize' },
      { class: 'top-left corner', type: 'resize' },
      { class: 'top-right corner', type: 'resize' },
      { class: 'bottom-left corner', type: 'resize' },
      { class: 'bottom-right corner', type: 'resize' },
      { class: 'move-handle', type: 'move' } // Ручка для перемещения
    ];

    // Убеждаемся, что элемент имеет position для правильного позиционирования
    const computed = iframeWindow.getComputedStyle(element);
    const originalPosition = element.style.position;
    if (computed.position === 'static') {
      element.style.position = 'relative';
    }

    positions.forEach(pos => {
      const handle = iframeDoc.createElement('div');
      
      if (pos.type === 'move') {
        // Ручка для перемещения в центре элемента
        handle.className = 'visual-editor-resize-handle move-handle';
        handle.style.cssText = `
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 20px;
          height: 20px;
          background: #33f5c8;
          border: 2px solid #fff;
          border-radius: 50%;
          cursor: move;
          z-index: 10001;
          box-shadow: 0 0 10px rgba(51, 245, 200, 0.8);
        `;
        
        handle.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.startMove(element, e);
        });
      } else {
        handle.className = `visual-editor-resize-handle ${pos.class}`;
        
        handle.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.startResize(element, pos.class, e);
        });
      }
      
      element.appendChild(handle);
    });
  }
  
  startMove(element, e) {
    this.isMovingElement = true;
    
    const iframe = document.getElementById('sitePreview');
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    const iframeWindow = iframe.contentWindow;
    const iframeRect = iframe.getBoundingClientRect();
    
    const computed = iframeWindow.getComputedStyle(element);
    const startX = e.clientX - iframeRect.left;
    const startY = e.clientY - iframeRect.top;
    
    // Получаем текущую позицию элемента
    const currentLeft = parseInt(computed.left) || 0;
    const currentTop = parseInt(computed.top) || 0;
    
    this.moveStart = {
      x: startX - currentLeft,
      y: startY - currentTop,
      elementLeft: currentLeft,
      elementTop: currentTop
    };
    
    // Убеждаемся, что элемент может перемещаться
    if (computed.position === 'static') {
      element.style.position = 'relative';
    }
    
    const onMouseMove = (e) => {
      if (!this.isMovingElement) return;
      
      const currentX = e.clientX - iframeRect.left;
      const currentY = e.clientY - iframeRect.top;
      
      const newLeft = currentX - this.moveStart.x;
      const newTop = currentY - this.moveStart.y;
      
      element.style.left = newLeft + 'px';
      element.style.top = newTop + 'px';
    };
    
    const onMouseUp = () => {
      this.isMovingElement = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  startResize(element, handleType, e) {
    this.isDragging = true;
    this.dragType = handleType;
    
    const iframe = document.getElementById('sitePreview');
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    const iframeWindow = iframe.contentWindow;
    const iframeRect = iframe.getBoundingClientRect();
    
    const computed = iframeWindow.getComputedStyle(element);
    const startX = e.clientX - iframeRect.left;
    const startY = e.clientY - iframeRect.top;
    
    // Получаем начальные размеры и позицию
    const initialRect = element.getBoundingClientRect();
    const initialStyles = {
      width: parseInt(computed.width) || initialRect.width,
      height: parseInt(computed.height) || initialRect.height,
      paddingTop: parseInt(computed.paddingTop) || 0,
      paddingBottom: parseInt(computed.paddingBottom) || 0,
      paddingLeft: parseInt(computed.paddingLeft) || 0,
      paddingRight: parseInt(computed.paddingRight) || 0,
      left: parseInt(computed.left) || 0,
      top: parseInt(computed.top) || 0
    };
    
    this.dragStart = { x: startX, y: startY };
    
    // Убеждаемся, что элемент может изменять размер
    if (computed.position === 'static') {
      element.style.position = 'relative';
    }
    
    const onMouseMove = (e) => {
      if (!this.isDragging) return;
      
      const currentX = e.clientX - iframeRect.left;
      const currentY = e.clientY - iframeRect.top;
      
      const deltaX = currentX - this.dragStart.x;
      const deltaY = currentY - this.dragStart.y;
      
      // Изменение размеров через углы
      if (handleType.includes('corner')) {
        if (handleType.includes('right')) {
          const newWidth = Math.max(50, initialStyles.width + deltaX);
          element.style.width = newWidth + 'px';
        }
        if (handleType.includes('bottom')) {
          const newHeight = Math.max(50, initialStyles.height + deltaY);
          element.style.height = newHeight + 'px';
        }
        if (handleType.includes('left')) {
          const newWidth = Math.max(50, initialStyles.width - deltaX);
          element.style.width = newWidth + 'px';
          element.style.left = (initialStyles.left + deltaX) + 'px';
        }
        if (handleType.includes('top')) {
          const newHeight = Math.max(50, initialStyles.height - deltaY);
          element.style.height = newHeight + 'px';
          element.style.top = (initialStyles.top + deltaY) + 'px';
        }
      }
      // Изменение отступов через боковые ручки
      else {
        if (handleType.includes('top')) {
          const newPadding = Math.max(0, initialStyles.paddingTop - deltaY);
          element.style.paddingTop = newPadding + 'px';
          const paddingTopInput = document.getElementById('paddingTop');
          if (paddingTopInput) paddingTopInput.value = newPadding;
        }
        
        if (handleType.includes('bottom')) {
          const newPadding = Math.max(0, initialStyles.paddingBottom + deltaY);
          element.style.paddingBottom = newPadding + 'px';
          const paddingBottomInput = document.getElementById('paddingBottom');
          if (paddingBottomInput) paddingBottomInput.value = newPadding;
        }
        
        if (handleType.includes('left')) {
          const newPadding = Math.max(0, initialStyles.paddingLeft - deltaX);
          element.style.paddingLeft = newPadding + 'px';
          const paddingLeftInput = document.getElementById('paddingLeft');
          if (paddingLeftInput) paddingLeftInput.value = newPadding;
        }
        
        if (handleType.includes('right')) {
          const newPadding = Math.max(0, initialStyles.paddingRight + deltaX);
          element.style.paddingRight = newPadding + 'px';
          const paddingRightInput = document.getElementById('paddingRight');
          if (paddingRightInput) paddingRightInput.value = newPadding;
        }
      }
    };

    const onMouseUp = () => {
      this.isDragging = false;
      this.dragType = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  togglePanel() {
    const panel = document.getElementById('editorPanel');
    panel.classList.toggle('collapsed');
    
    const icon = document.querySelector('#togglePanel i');
    if (panel.classList.contains('collapsed')) {
      icon.className = 'fas fa-chevron-right';
    } else {
      icon.className = 'fas fa-chevron-left';
    }
  }

  refreshPreview() {
    const iframe = document.getElementById('sitePreview');
    iframe.src = iframe.src;
  }

  toggleFullscreen() {
    const previewArea = document.getElementById('previewArea');
    
    if (!document.fullscreenElement) {
      previewArea.requestFullscreen().catch(err => {
        console.error('Ошибка входа в полноэкранный режим:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  rgbToHex(rgb) {
    if (rgb.startsWith('#')) return rgb;
    
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return '#000000';
    
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    
    return `#${r}${g}${b}`;
  }
  
  updateDebugInfo(message) {
    const debugDiv = document.getElementById('debugInfo');
    if (debugDiv) {
      const time = new Date().toLocaleTimeString();
      debugDiv.textContent = `[${time}] ${message}`;
      debugDiv.scrollTop = debugDiv.scrollHeight;
    }
  }
}

// Инициализация редактора
document.addEventListener('DOMContentLoaded', () => {
  new VisualEditor();
});
