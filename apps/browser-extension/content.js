/**
 * GalaOS Browser Extension - Content Script
 *
 * Injected into every webpage to provide AI agent capabilities
 * Communicates with background worker for agent operations
 */

// GalaOS overlay UI
let galaosPanel = null;
let isInitialized = false;

// Initialize content script
(function initialize() {
  if (isInitialized) return;
  isInitialized = true;

  console.log('[GalaOS Content] Initializing...');

  // Create floating action button
  createFloatingButton();

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener(handleMessage);

  // Set up page observers
  setupPageObservers();

  console.log('[GalaOS Content] Initialized successfully');
})();

/**
 * Create floating action button
 */
function createFloatingButton() {
  const button = document.createElement('div');
  button.id = 'galaos-fab';
  button.className = 'galaos-fab';
  button.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
      <path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="2"/>
    </svg>
  `;
  button.title = 'GalaOS AI Agent (Ctrl+Shift+G)';

  button.addEventListener('click', togglePanel);
  document.body.appendChild(button);
}

/**
 * Toggle agent panel
 */
function togglePanel() {
  if (galaosPanel) {
    closePanel();
  } else {
    openPanel();
  }
}

/**
 * Open agent panel
 */
function openPanel() {
  if (galaosPanel) return;

  galaosPanel = document.createElement('div');
  galaosPanel.id = 'galaos-panel';
  galaosPanel.className = 'galaos-panel';
  galaosPanel.innerHTML = `
    <div class="galaos-panel-header">
      <div class="galaos-panel-title">
        <span class="galaos-logo">🌌</span>
        <span>GalaOS AI Agent</span>
      </div>
      <button class="galaos-panel-close" id="galaos-close-btn">×</button>
    </div>
    <div class="galaos-panel-body">
      <div class="galaos-tabs">
        <button class="galaos-tab active" data-tab="chat">Chat</button>
        <button class="galaos-tab" data-tab="analyze">Analyze</button>
        <button class="galaos-tab" data-tab="extract">Extract</button>
        <button class="galaos-tab" data-tab="workflows">Workflows</button>
      </div>

      <div class="galaos-tab-content" id="galaos-tab-chat">
        <div class="galaos-chat-messages" id="galaos-messages"></div>
        <div class="galaos-chat-input">
          <input type="text" id="galaos-input" placeholder="Ask GalaOS anything...">
          <button id="galaos-send-btn">Send</button>
        </div>
      </div>

      <div class="galaos-tab-content hidden" id="galaos-tab-analyze">
        <div class="galaos-actions">
          <button class="galaos-action-btn" data-action="analyze-page">
            📊 Analyze Page
          </button>
          <button class="galaos-action-btn" data-action="summarize">
            📝 Summarize
          </button>
          <button class="galaos-action-btn" data-action="sentiment">
            😊 Sentiment Analysis
          </button>
          <button class="galaos-action-btn" data-action="keywords">
            🔑 Extract Keywords
          </button>
        </div>
        <div class="galaos-results" id="galaos-analyze-results"></div>
      </div>

      <div class="galaos-tab-content hidden" id="galaos-tab-extract">
        <div class="galaos-actions">
          <button class="galaos-action-btn" data-action="extract-text">
            📄 Extract Text
          </button>
          <button class="galaos-action-btn" data-action="extract-links">
            🔗 Extract Links
          </button>
          <button class="galaos-action-btn" data-action="extract-images">
            🖼️ Extract Images
          </button>
          <button class="galaos-action-btn" data-action="extract-tables">
            📊 Extract Tables
          </button>
        </div>
        <div class="galaos-results" id="galaos-extract-results"></div>
      </div>

      <div class="galaos-tab-content hidden" id="galaos-tab-workflows">
        <div class="galaos-workflows-list" id="galaos-workflows-list">
          <p class="galaos-empty">No workflows yet. Create one in the extension popup!</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(galaosPanel);

  // Set up event listeners
  setupPanelEventListeners();

  // Load workflows
  loadWorkflows();
}

/**
 * Close agent panel
 */
function closePanel() {
  if (galaosPanel) {
    galaosPanel.remove();
    galaosPanel = null;
  }
}

/**
 * Setup panel event listeners
 */
function setupPanelEventListeners() {
  // Close button
  document.getElementById('galaos-close-btn').addEventListener('click', closePanel);

  // Tab switching
  document.querySelectorAll('.galaos-tab').forEach((tab) => {
    tab.addEventListener('click', (e) => {
      const targetTab = e.target.dataset.tab;
      switchTab(targetTab);
    });
  });

  // Chat input
  const input = document.getElementById('galaos-input');
  const sendBtn = document.getElementById('galaos-send-btn');

  sendBtn.addEventListener('click', () => sendMessage(input.value));
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage(input.value);
  });

  // Action buttons
  document.querySelectorAll('.galaos-action-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const action = e.currentTarget.dataset.action;
      executeAction(action);
    });
  });
}

/**
 * Switch tab
 */
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.galaos-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  // Update tab content
  document.querySelectorAll('.galaos-tab-content').forEach((content) => {
    content.classList.toggle('hidden', !content.id.includes(tabName));
  });
}

/**
 * Send chat message
 */
async function sendMessage(message) {
  if (!message.trim()) return;

  const input = document.getElementById('galaos-input');
  const messagesDiv = document.getElementById('galaos-messages');

  // Clear input
  input.value = '';

  // Add user message
  addChatMessage('user', message);

  // Add loading indicator
  const loadingId = addChatMessage('assistant', 'Thinking...', true);

  // Send to background script
  chrome.runtime.sendMessage(
    {
      type: 'CHAT',
      message,
      context: await capturePageContext(),
    },
    (response) => {
      // Remove loading
      document.getElementById(loadingId)?.remove();

      // Add assistant response
      if (response && response.reply) {
        addChatMessage('assistant', response.reply);
      } else {
        addChatMessage('assistant', 'Sorry, I encountered an error. Please try again.');
      }
    }
  );
}

/**
 * Add chat message to UI
 */
function addChatMessage(role, content, isLoading = false) {
  const messagesDiv = document.getElementById('galaos-messages');
  const messageId = `msg-${Date.now()}`;

  const messageDiv = document.createElement('div');
  messageDiv.id = messageId;
  messageDiv.className = `galaos-message galaos-message-${role}`;
  messageDiv.innerHTML = `
    <div class="galaos-message-avatar">${role === 'user' ? '👤' : '🌌'}</div>
    <div class="galaos-message-content">${escapeHtml(content)}</div>
  `;

  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;

  return messageId;
}

/**
 * Execute action
 */
async function executeAction(action) {
  const resultsDiv = document.getElementById(
    action.startsWith('analyze') || action === 'sentiment' || action === 'keywords'
      ? 'galaos-analyze-results'
      : 'galaos-extract-results'
  );

  resultsDiv.innerHTML = '<div class="galaos-loading">Processing...</div>';

  try {
    let result;

    switch (action) {
      case 'analyze-page':
        result = await analyzeCurrentPage();
        break;
      case 'summarize':
        result = await summarizePage();
        break;
      case 'sentiment':
        result = await analyzeSentiment();
        break;
      case 'keywords':
        result = await extractKeywords();
        break;
      case 'extract-text':
        result = extractText();
        break;
      case 'extract-links':
        result = extractLinks();
        break;
      case 'extract-images':
        result = extractImages();
        break;
      case 'extract-tables':
        result = extractTables();
        break;
      default:
        result = { error: 'Unknown action' };
    }

    displayResults(resultsDiv, result);
  } catch (error) {
    resultsDiv.innerHTML = `<div class="galaos-error">Error: ${error.message}</div>`;
  }
}

/**
 * Display results in UI
 */
function displayResults(container, results) {
  if (results.error) {
    container.innerHTML = `<div class="galaos-error">${results.error}</div>`;
    return;
  }

  if (typeof results === 'string') {
    container.innerHTML = `<div class="galaos-result-text">${escapeHtml(results)}</div>`;
    return;
  }

  // Format as JSON if object
  container.innerHTML = `
    <pre class="galaos-result-json">${JSON.stringify(results, null, 2)}</pre>
    <button class="galaos-copy-btn" onclick="navigator.clipboard.writeText('${JSON.stringify(results)}')">
      📋 Copy to Clipboard
    </button>
  `;
}

/**
 * Capture page context
 */
async function capturePageContext() {
  return {
    url: window.location.href,
    title: document.title,
    text: document.body.innerText.substring(0, 5000),
    selection: window.getSelection().toString(),
  };
}

/**
 * Analyze current page
 */
async function analyzeCurrentPage() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: 'ANALYZE_PAGE',
        context: captureFullContext(),
      },
      resolve
    );
  });
}

/**
 * Summarize page
 */
async function summarizePage() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: 'SUMMARIZE',
        text: document.body.innerText,
      },
      resolve
    );
  });
}

/**
 * Analyze sentiment
 */
async function analyzeSentiment() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: 'SENTIMENT',
        text: document.body.innerText,
      },
      resolve
    );
  });
}

/**
 * Extract keywords
 */
async function extractKeywords() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: 'KEYWORDS',
        text: document.body.innerText,
      },
      resolve
    );
  });
}

/**
 * Extract text
 */
function extractText() {
  return {
    text: document.body.innerText,
    wordCount: document.body.innerText.split(/\s+/).length,
    characterCount: document.body.innerText.length,
  };
}

/**
 * Extract links
 */
function extractLinks() {
  const links = Array.from(document.querySelectorAll('a[href]')).map((a) => ({
    text: a.innerText.trim(),
    href: a.href,
    domain: new URL(a.href).hostname,
  }));

  return {
    count: links.length,
    links: links.slice(0, 100), // Limit to 100
  };
}

/**
 * Extract images
 */
function extractImages() {
  const images = Array.from(document.querySelectorAll('img[src]')).map((img) => ({
    src: img.src,
    alt: img.alt,
    width: img.naturalWidth,
    height: img.naturalHeight,
  }));

  return {
    count: images.length,
    images: images.slice(0, 50), // Limit to 50
  };
}

/**
 * Extract tables
 */
function extractTables() {
  const tables = Array.from(document.querySelectorAll('table')).map((table) => {
    const rows = Array.from(table.querySelectorAll('tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td, th')).map((cell) => cell.innerText.trim())
    );
    return rows;
  });

  return {
    count: tables.length,
    tables: tables.slice(0, 10), // Limit to 10
  };
}

/**
 * Capture full page context
 */
function captureFullContext() {
  return {
    url: window.location.href,
    title: document.title,
    text: document.body.innerText.substring(0, 10000),
    html: document.documentElement.outerHTML.substring(0, 50000),
    meta: {
      description: document.querySelector('meta[name="description"]')?.content,
      keywords: document.querySelector('meta[name="keywords"]')?.content,
      author: document.querySelector('meta[name="author"]')?.content,
      ogImage: document.querySelector('meta[property="og:image"]')?.content,
    },
    links: extractLinks(),
    images: extractImages(),
    timestamp: Date.now(),
  };
}

/**
 * Load workflows
 */
function loadWorkflows() {
  chrome.runtime.sendMessage({ type: 'GET_WORKFLOWS' }, (workflows) => {
    const listDiv = document.getElementById('galaos-workflows-list');

    if (!workflows || workflows.length === 0) {
      listDiv.innerHTML = '<p class="galaos-empty">No workflows yet.</p>';
      return;
    }

    listDiv.innerHTML = workflows
      .map(
        (workflow) => `
      <div class="galaos-workflow-item">
        <div class="galaos-workflow-name">${workflow.name}</div>
        <div class="galaos-workflow-desc">${workflow.description || ''}</div>
        <button class="galaos-workflow-run" data-id="${workflow.id}">Run</button>
      </div>
    `
      )
      .join('');

    // Add click handlers
    listDiv.querySelectorAll('.galaos-workflow-run').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const workflowId = e.target.dataset.id;
        runWorkflow(workflowId);
      });
    });
  });
}

/**
 * Run workflow
 */
function runWorkflow(workflowId) {
  chrome.runtime.sendMessage(
    {
      type: 'RUN_WORKFLOW',
      workflowId,
      context: captureFullContext(),
    },
    (response) => {
      if (response.success) {
        alert('Workflow started successfully!');
      } else {
        alert('Failed to start workflow: ' + response.error);
      }
    }
  );
}

/**
 * Setup page observers
 */
function setupPageObservers() {
  // Observe DOM changes for dynamic pages
  const observer = new MutationObserver((mutations) => {
    // Handle dynamic content updates
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * Handle messages from background script
 */
function handleMessage(message, sender, sendResponse) {
  console.log('[GalaOS Content] Message received:', message.type);

  switch (message.type) {
    case 'SHOW_PANEL':
      openPanel();
      sendResponse({ success: true });
      break;

    case 'HIDE_PANEL':
      closePanel();
      sendResponse({ success: true });
      break;

    case 'HIGHLIGHT_ELEMENT':
      highlightElement(message.selector);
      sendResponse({ success: true });
      break;

    case 'CAPTURE_CONTEXT':
      sendResponse({ context: captureFullContext() });
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }

  return true; // Keep message channel open
}

/**
 * Highlight element
 */
function highlightElement(selector) {
  const element = document.querySelector(selector);
  if (!element) return;

  element.classList.add('galaos-highlight');
  setTimeout(() => {
    element.classList.remove('galaos-highlight');
  }, 3000);
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    extractText,
    extractLinks,
    extractImages,
    extractTables,
  };
}
