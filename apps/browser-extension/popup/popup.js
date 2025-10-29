/**
 * GalaOS Browser Extension - Popup Script
 */

let extensionState = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[GalaOS Popup] Initializing...');

  // Load extension state
  await loadState();

  // Setup event listeners
  setupEventListeners();

  // Check authentication
  if (extensionState?.isAuthenticated) {
    showMainView();
    await loadIntegrations();
    await loadActivity();
  } else {
    showAuthView();
  }
});

/**
 * Load extension state
 */
async function loadState() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
    extensionState = response;

    // Update status indicator
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');

    if (extensionState?.isAuthenticated) {
      statusDot.classList.add('connected');
      statusText.textContent = 'Connected';
    } else {
      statusDot.classList.remove('connected');
      statusText.textContent = 'Disconnected';
    }
  } catch (error) {
    console.error('[GalaOS Popup] Failed to load state:', error);
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Connect button
  document.getElementById('connect-btn')?.addEventListener('click', handleConnect);

  // API key input (Enter key)
  document.getElementById('api-key-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleConnect();
  });

  // Quick action buttons
  document.querySelectorAll('.action-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      const action = e.currentTarget.dataset.action;
      handleQuickAction(action);
    });
  });

  // Settings button
  document.getElementById('settings-btn')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Disconnect button
  document.getElementById('disconnect-btn')?.addEventListener('click', handleDisconnect);
}

/**
 * Handle connect
 */
async function handleConnect() {
  const apiKeyInput = document.getElementById('api-key-input');
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    alert('Please enter your API key');
    return;
  }

  if (!apiKey.startsWith('sk-galaos-')) {
    alert('Invalid API key format. API keys should start with "sk-galaos-"');
    return;
  }

  const connectBtn = document.getElementById('connect-btn');
  connectBtn.textContent = 'Connecting...';
  connectBtn.disabled = true;

  try {
    // Send API key to background script
    const response = await chrome.runtime.sendMessage({
      type: 'SET_API_KEY',
      apiKey,
    });

    if (response.success) {
      // Reload state
      await loadState();
      showMainView();
      await loadIntegrations();
      await loadActivity();
    } else {
      throw new Error('Failed to connect');
    }
  } catch (error) {
    console.error('[GalaOS Popup] Connection failed:', error);
    alert('Failed to connect. Please check your API key and try again.');
    connectBtn.textContent = 'Connect';
    connectBtn.disabled = false;
  }
}

/**
 * Handle disconnect
 */
async function handleDisconnect() {
  if (!confirm('Are you sure you want to disconnect?')) {
    return;
  }

  try {
    await chrome.runtime.sendMessage({
      type: 'SET_API_KEY',
      apiKey: null,
    });

    // Clear input
    document.getElementById('api-key-input').value = '';

    // Reload state
    await loadState();
    showAuthView();
  } catch (error) {
    console.error('[GalaOS Popup] Disconnect failed:', error);
    alert('Failed to disconnect');
  }
}

/**
 * Handle quick action
 */
async function handleQuickAction(action) {
  console.log('[GalaOS Popup] Quick action:', action);

  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    switch (action) {
      case 'analyze':
        await chrome.runtime.sendMessage({
          type: 'ANALYZE_PAGE',
          tabId: tab.id,
        });
        showNotification('Analyzing page...', 'success');
        break;

      case 'summarize':
        await chrome.runtime.sendMessage({
          type: 'SUMMARIZE_PAGE',
          tabId: tab.id,
        });
        showNotification('Generating summary...', 'success');
        break;

      case 'extract':
        await chrome.runtime.sendMessage({
          type: 'EXTRACT_DATA',
          tabId: tab.id,
        });
        showNotification('Extracting data...', 'success');
        break;

      case 'chat':
        // Open side panel
        await chrome.runtime.sendMessage({
          type: 'SHOW_PANEL',
          tabId: tab.id,
        });
        window.close();
        break;

      default:
        console.warn('Unknown action:', action);
    }
  } catch (error) {
    console.error('[GalaOS Popup] Action failed:', error);
    showNotification('Action failed', 'error');
  }
}

/**
 * Load integrations
 */
async function loadIntegrations() {
  const listDiv = document.getElementById('integrations-list');
  listDiv.innerHTML = '<div class="loading">Loading integrations...</div>';

  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_INTEGRATIONS' });
    const integrations = response || [];

    if (integrations.length === 0) {
      listDiv.innerHTML = '<div class="empty-state">No integrations connected</div>';
      return;
    }

    // Show only connected integrations (limit to 5)
    const connected = integrations.filter((i) => i.connected).slice(0, 5);

    if (connected.length === 0) {
      listDiv.innerHTML = '<div class="empty-state">No integrations connected</div>';
      return;
    }

    listDiv.innerHTML = connected
      .map(
        (integration) => `
      <div class="integration-item">
        <div class="integration-info">
          <span class="integration-icon">${integration.icon || '🔗'}</span>
          <span class="integration-name">${integration.name}</span>
        </div>
        <span class="integration-badge">Connected</span>
      </div>
    `
      )
      .join('');
  } catch (error) {
    console.error('[GalaOS Popup] Failed to load integrations:', error);
    listDiv.innerHTML = '<div class="empty-state">Failed to load integrations</div>';
  }
}

/**
 * Load recent activity
 */
async function loadActivity() {
  const listDiv = document.getElementById('activity-list');

  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_ACTIVITY' });
    const activities = response || [];

    if (activities.length === 0) {
      listDiv.innerHTML = '<div class="empty-state">No recent activity</div>';
      return;
    }

    // Show last 5 activities
    listDiv.innerHTML = activities
      .slice(0, 5)
      .map(
        (activity) => `
      <div class="activity-item">
        <div class="activity-title">${activity.title}</div>
        <div class="activity-time">${formatTime(activity.timestamp)}</div>
      </div>
    `
      )
      .join('');
  } catch (error) {
    console.error('[GalaOS Popup] Failed to load activity:', error);
    listDiv.innerHTML = '<div class="empty-state">No recent activity</div>';
  }
}

/**
 * Show auth view
 */
function showAuthView() {
  document.getElementById('auth-view').classList.remove('hidden');
  document.getElementById('main-view').classList.add('hidden');
}

/**
 * Show main view
 */
function showMainView() {
  document.getElementById('auth-view').classList.add('hidden');
  document.getElementById('main-view').classList.remove('hidden');
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: '../icons/icon-128.png',
    title: 'GalaOS AI Agent',
    message,
  });
}

/**
 * Format timestamp
 */
function formatTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}
