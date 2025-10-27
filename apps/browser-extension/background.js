/**
 * GalaOS Browser Extension - Background Service Worker
 *
 * This is the main orchestration layer for the AI agent extension.
 * Handles:
 * - Agent coordination and execution
 * - Workflow automation
 * - Tool/action execution
 * - Communication with GalaOS API
 * - Context management
 * - State persistence
 */

// Configuration
const GALAOS_API_URL = 'http://localhost:3000/api'; // Update with your GalaOS URL
let extensionState = {
  isAuthenticated: false,
  apiKey: null,
  activeWorkflows: [],
  agentMemory: [],
  tools: [],
  integrations: [],
  contextHistory: [],
};

// Initialize extension
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[GalaOS] Extension installed/updated:', details.reason);

  // Load saved state
  const saved = await chrome.storage.local.get(['state']);
  if (saved.state) {
    extensionState = { ...extensionState, ...saved.state };
  }

  // Set up context menus
  setupContextMenus();

  // Initialize agent capabilities
  await initializeAgent();

  // Start background tasks
  startBackgroundTasks();
});

/**
 * Set up context menus for quick actions
 */
function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    // Main GalaOS menu
    chrome.contextMenus.create({
      id: 'galaos-main',
      title: 'GalaOS AI Agent',
      contexts: ['all'],
    });

    // Agent actions
    chrome.contextMenus.create({
      id: 'analyze-page',
      parentId: 'galaos-main',
      title: 'Analyze This Page',
      contexts: ['page', 'selection'],
    });

    chrome.contextMenus.create({
      id: 'summarize-selection',
      parentId: 'galaos-main',
      title: 'Summarize Selection',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: 'extract-data',
      parentId: 'galaos-main',
      title: 'Extract Data',
      contexts: ['page'],
    });

    chrome.contextMenus.create({
      id: 'run-workflow',
      parentId: 'galaos-main',
      title: 'Run Workflow...',
      contexts: ['all'],
    });

    // Integration actions
    chrome.contextMenus.create({
      id: 'integrations',
      parentId: 'galaos-main',
      title: 'Send to Integration',
      contexts: ['selection', 'page'],
    });

    chrome.contextMenus.create({
      id: 'send-to-notion',
      parentId: 'integrations',
      title: 'Send to Notion',
      contexts: ['selection', 'page'],
    });

    chrome.contextMenus.create({
      id: 'send-to-slack',
      parentId: 'integrations',
      title: 'Send to Slack',
      contexts: ['selection', 'page'],
    });

    chrome.contextMenus.create({
      id: 'create-github-issue',
      parentId: 'integrations',
      title: 'Create GitHub Issue',
      contexts: ['selection'],
    });
  });
}

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('[GalaOS] Context menu clicked:', info.menuItemId);

  switch (info.menuItemId) {
    case 'analyze-page':
      await analyzePageWithAgent(tab.id);
      break;

    case 'summarize-selection':
      if (info.selectionText) {
        await summarizeText(info.selectionText, tab.id);
      }
      break;

    case 'extract-data':
      await extractDataFromPage(tab.id);
      break;

    case 'run-workflow':
      await showWorkflowSelector(tab.id);
      break;

    case 'send-to-notion':
      await sendToNotion(info, tab);
      break;

    case 'send-to-slack':
      await sendToSlack(info, tab);
      break;

    case 'create-github-issue':
      await createGitHubIssue(info, tab);
      break;
  }
});

/**
 * Handle keyboard commands
 */
chrome.commands.onCommand.addListener(async (command) => {
  console.log('[GalaOS] Command triggered:', command);

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  switch (command) {
    case 'trigger_agent':
      await analyzePageWithAgent(tab.id);
      break;

    case 'start_workflow':
      await showWorkflowSelector(tab.id);
      break;

    case 'capture_context':
      await capturePageContext(tab.id);
      break;
  }
});

/**
 * Initialize AI agent capabilities
 */
async function initializeAgent() {
  console.log('[GalaOS] Initializing AI agent...');

  try {
    // Load available tools
    extensionState.tools = await loadAvailableTools();

    // Load integrations
    extensionState.integrations = await loadIntegrations();

    // Load saved workflows
    const { workflows } = await chrome.storage.local.get(['workflows']);
    extensionState.activeWorkflows = workflows || [];

    console.log('[GalaOS] Agent initialized with:', {
      tools: extensionState.tools.length,
      integrations: extensionState.integrations.length,
      workflows: extensionState.activeWorkflows.length,
    });
  } catch (error) {
    console.error('[GalaOS] Failed to initialize agent:', error);
  }
}

/**
 * Load available tools from GalaOS
 */
async function loadAvailableTools() {
  if (!extensionState.isAuthenticated) {
    return getOfflineTools();
  }

  try {
    const response = await fetch(`${GALAOS_API_URL}/tools/list`, {
      headers: {
        Authorization: `Bearer ${extensionState.apiKey}`,
      },
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn('[GalaOS] Failed to load tools from API, using offline tools');
  }

  return getOfflineTools();
}

/**
 * Get offline tools (available without API connection)
 */
function getOfflineTools() {
  return [
    {
      id: 'extract_text',
      name: 'Extract Text',
      description: 'Extract all text content from a webpage',
      category: 'extraction',
    },
    {
      id: 'extract_links',
      name: 'Extract Links',
      description: 'Extract all links from a webpage',
      category: 'extraction',
    },
    {
      id: 'extract_images',
      name: 'Extract Images',
      description: 'Extract all images from a webpage',
      category: 'extraction',
    },
    {
      id: 'take_screenshot',
      name: 'Take Screenshot',
      description: 'Capture a screenshot of the page or selection',
      category: 'capture',
    },
    {
      id: 'monitor_changes',
      name: 'Monitor Changes',
      description: 'Monitor a page for changes',
      category: 'automation',
    },
    {
      id: 'fill_form',
      name: 'Fill Form',
      description: 'Automatically fill form fields',
      category: 'automation',
    },
    {
      id: 'click_element',
      name: 'Click Element',
      description: 'Click a specific element on the page',
      category: 'automation',
    },
    {
      id: 'scroll_page',
      name: 'Scroll Page',
      description: 'Scroll the page to a specific element or position',
      category: 'navigation',
    },
  ];
}

/**
 * Load integrations from GalaOS
 */
async function loadIntegrations() {
  if (!extensionState.isAuthenticated) {
    return [];
  }

  try {
    const response = await fetch(`${GALAOS_API_URL}/integration/getProviders`, {
      headers: {
        Authorization: `Bearer ${extensionState.apiKey}`,
      },
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn('[GalaOS] Failed to load integrations');
  }

  return [];
}

/**
 * Analyze page with AI agent
 */
async function analyzePageWithAgent(tabId) {
  console.log('[GalaOS] Analyzing page with AI agent...');

  try {
    // Capture page context
    const context = await capturePageContext(tabId);

    // Send to GalaOS API for analysis
    const response = await fetch(`${GALAOS_API_URL}/agent/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${extensionState.apiKey}`,
      },
      body: JSON.stringify({
        context,
        mode: 'analyze',
      }),
    });

    if (response.ok) {
      const result = await response.json();

      // Show results to user
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'Page Analysis Complete',
        message: result.summary || 'Analysis completed successfully',
      });

      // Store in memory
      extensionState.agentMemory.push({
        type: 'analysis',
        timestamp: Date.now(),
        tabId,
        context,
        result,
      });

      return result;
    }
  } catch (error) {
    console.error('[GalaOS] Analysis failed:', error);
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: 'Analysis Failed',
      message: error.message,
    });
  }
}

/**
 * Capture page context
 */
async function capturePageContext(tabId) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      return {
        url: window.location.href,
        title: document.title,
        text: document.body.innerText.substring(0, 10000), // Limit size
        html: document.documentElement.outerHTML.substring(0, 50000),
        meta: {
          description: document.querySelector('meta[name="description"]')?.content,
          keywords: document.querySelector('meta[name="keywords"]')?.content,
          ogImage: document.querySelector('meta[property="og:image"]')?.content,
          author: document.querySelector('meta[name="author"]')?.content,
        },
        links: Array.from(document.querySelectorAll('a[href]')).map((a) => ({
          text: a.innerText,
          href: a.href,
        })),
        images: Array.from(document.querySelectorAll('img[src]')).map((img) => ({
          src: img.src,
          alt: img.alt,
        })),
        forms: Array.from(document.querySelectorAll('form')).map((form) => ({
          action: form.action,
          method: form.method,
          fields: Array.from(form.querySelectorAll('input, select, textarea')).map(
            (field) => ({
              name: field.name,
              type: field.type,
              value: field.value,
            })
          ),
        })),
        timestamp: Date.now(),
      };
    },
  });

  return result.result;
}

/**
 * Summarize text with AI
 */
async function summarizeText(text, tabId) {
  console.log('[GalaOS] Summarizing text...');

  try {
    const response = await fetch(`${GALAOS_API_URL}/agent/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${extensionState.apiKey}`,
      },
      body: JSON.stringify({ text }),
    });

    if (response.ok) {
      const result = await response.json();

      // Show summary in popup
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'Summary',
        message: result.summary.substring(0, 200),
      });

      return result;
    }
  } catch (error) {
    console.error('[GalaOS] Summarization failed:', error);
  }
}

/**
 * Extract structured data from page
 */
async function extractDataFromPage(tabId) {
  console.log('[GalaOS] Extracting data from page...');

  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      // Smart data extraction
      const data = {
        tables: [],
        lists: [],
        articles: [],
        products: [],
      };

      // Extract tables
      document.querySelectorAll('table').forEach((table) => {
        const rows = [];
        table.querySelectorAll('tr').forEach((tr) => {
          const cells = Array.from(tr.querySelectorAll('td, th')).map(
            (cell) => cell.innerText
          );
          rows.push(cells);
        });
        data.tables.push(rows);
      });

      // Extract lists
      document.querySelectorAll('ul, ol').forEach((list) => {
        const items = Array.from(list.querySelectorAll('li')).map(
          (li) => li.innerText
        );
        data.lists.push(items);
      });

      // Extract articles
      document.querySelectorAll('article, [role="article"]').forEach((article) => {
        data.articles.push({
          title: article.querySelector('h1, h2, h3')?.innerText,
          content: article.innerText.substring(0, 1000),
        });
      });

      // Extract products (common e-commerce patterns)
      document
        .querySelectorAll('[itemtype*="Product"], .product, [data-product]')
        .forEach((product) => {
          data.products.push({
            name: product.querySelector('[itemprop="name"], .product-name, h1, h2')
              ?.innerText,
            price: product.querySelector('[itemprop="price"], .price, .product-price')
              ?.innerText,
            image: product.querySelector('img')?.src,
          });
        });

      return data;
    },
  });

  console.log('[GalaOS] Extracted data:', result.result);

  // Download as JSON
  const blob = new Blob([JSON.stringify(result.result, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);

  await chrome.downloads.download({
    url,
    filename: 'extracted-data.json',
    saveAs: true,
  });
}

/**
 * Show workflow selector
 */
async function showWorkflowSelector(tabId) {
  // Open side panel with workflow selection
  await chrome.sidePanel.open({ tabId });

  // Send message to side panel to show workflows
  await chrome.runtime.sendMessage({
    type: 'SHOW_WORKFLOWS',
    workflows: extensionState.activeWorkflows,
  });
}

/**
 * Send content to Notion
 */
async function sendToNotion(info, tab) {
  console.log('[GalaOS] Sending to Notion...');

  try {
    const content = info.selectionText || (await capturePageContext(tab.id));

    const response = await fetch(`${GALAOS_API_URL}/integration/executeAction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${extensionState.apiKey}`,
      },
      body: JSON.stringify({
        integrationId: 'notion',
        actionName: 'create_page',
        actionInput: {
          parentId: 'default', // User should configure this
          title: tab.title,
          content: [
            {
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: [{ type: 'text', text: { content } }],
              },
            },
          ],
        },
      }),
    });

    if (response.ok) {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'Sent to Notion',
        message: 'Content successfully saved to Notion',
      });
    }
  } catch (error) {
    console.error('[GalaOS] Failed to send to Notion:', error);
  }
}

/**
 * Send content to Slack
 */
async function sendToSlack(info, tab) {
  console.log('[GalaOS] Sending to Slack...');

  try {
    const content = info.selectionText || tab.url;

    const response = await fetch(`${GALAOS_API_URL}/integration/executeAction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${extensionState.apiKey}`,
      },
      body: JSON.stringify({
        integrationId: 'slack',
        actionName: 'post_message',
        actionInput: {
          channel: 'general', // User should configure this
          text: `Shared from browser:\n${content}\n\nSource: ${tab.url}`,
        },
      }),
    });

    if (response.ok) {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'Sent to Slack',
        message: 'Content successfully posted to Slack',
      });
    }
  } catch (error) {
    console.error('[GalaOS] Failed to send to Slack:', error);
  }
}

/**
 * Create GitHub issue
 */
async function createGitHubIssue(info, tab) {
  console.log('[GalaOS] Creating GitHub issue...');

  try {
    const content = info.selectionText || '';

    const response = await fetch(`${GALAOS_API_URL}/integration/executeAction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${extensionState.apiKey}`,
      },
      body: JSON.stringify({
        integrationId: 'github',
        actionName: 'create_issue',
        actionInput: {
          owner: 'user', // User should configure this
          repo: 'repo',
          title: `Issue from browser: ${tab.title}`,
          body: `${content}\n\nSource: ${tab.url}`,
        },
      }),
    });

    if (response.ok) {
      const result = await response.json();
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'GitHub Issue Created',
        message: 'Issue successfully created on GitHub',
      });
    }
  } catch (error) {
    console.error('[GalaOS] Failed to create GitHub issue:', error);
  }
}

/**
 * Start background tasks
 */
function startBackgroundTasks() {
  // Periodic state sync
  chrome.alarms.create('sync-state', { periodInMinutes: 5 });

  // Monitor active workflows
  chrome.alarms.create('check-workflows', { periodInMinutes: 1 });

  chrome.alarms.onAlarm.addListener(async (alarm) => {
    switch (alarm.name) {
      case 'sync-state':
        await chrome.storage.local.set({ state: extensionState });
        break;

      case 'check-workflows':
        await checkActiveWorkflows();
        break;
    }
  });
}

/**
 * Check and execute active workflows
 */
async function checkActiveWorkflows() {
  for (const workflow of extensionState.activeWorkflows) {
    if (workflow.enabled && workflow.trigger === 'schedule') {
      // Check if workflow should run
      const shouldRun = checkWorkflowSchedule(workflow);
      if (shouldRun) {
        await executeWorkflow(workflow);
      }
    }
  }
}

/**
 * Check if workflow schedule matches current time
 */
function checkWorkflowSchedule(workflow) {
  if (!workflow.schedule) return false;

  const now = new Date();
  const { interval, lastRun } = workflow.schedule;

  if (!lastRun) return true;

  const timeSinceLastRun = now.getTime() - new Date(lastRun).getTime();
  const intervalMs = interval * 60 * 1000; // Convert minutes to ms

  return timeSinceLastRun >= intervalMs;
}

/**
 * Execute a workflow
 */
async function executeWorkflow(workflow) {
  console.log('[GalaOS] Executing workflow:', workflow.name);

  try {
    for (const step of workflow.steps) {
      await executeWorkflowStep(step);
    }

    // Update last run time
    workflow.schedule.lastRun = new Date().toISOString();
    await chrome.storage.local.set({
      workflows: extensionState.activeWorkflows,
    });

    console.log('[GalaOS] Workflow completed:', workflow.name);
  } catch (error) {
    console.error('[GalaOS] Workflow execution failed:', error);
  }
}

/**
 * Execute a single workflow step
 */
async function executeWorkflowStep(step) {
  console.log('[GalaOS] Executing step:', step.type);

  switch (step.type) {
    case 'navigate':
      await navigateToUrl(step.url);
      break;

    case 'extract':
      return await extractData(step.selector);

    case 'click':
      await clickElement(step.selector);
      break;

    case 'fill':
      await fillInput(step.selector, step.value);
      break;

    case 'wait':
      await wait(step.duration);
      break;

    case 'api_call':
      return await makeApiCall(step.endpoint, step.method, step.data);

    case 'integration':
      return await callIntegration(step.integration, step.action, step.input);

    default:
      throw new Error(`Unknown step type: ${step.type}`);
  }
}

/**
 * Workflow Helper Functions
 */

/**
 * Navigate to a URL
 */
async function navigateToUrl(url) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.tabs.update(tab.id, { url });

  // Wait for page to load
  return new Promise((resolve) => {
    const listener = (tabId, changeInfo) => {
      if (tabId === tab.id && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

/**
 * Extract data using a selector
 */
async function extractData(selector) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (sel) => {
      const elements = document.querySelectorAll(sel);
      return Array.from(elements).map((el) => ({
        text: el.textContent?.trim(),
        html: el.innerHTML,
        value: el.value || null,
        href: el.href || null,
        src: el.src || null,
      }));
    },
    args: [selector],
  });

  return results[0]?.result || [];
}

/**
 * Click an element
 */
async function clickElement(selector) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (sel) => {
      const element = document.querySelector(sel);
      if (!element) {
        throw new Error(`Element not found: ${sel}`);
      }
      element.click();
    },
    args: [selector],
  });
}

/**
 * Fill input field
 */
async function fillInput(selector, value) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (sel, val) => {
      const element = document.querySelector(sel);
      if (!element) {
        throw new Error(`Element not found: ${sel}`);
      }

      // Set value
      element.value = val;

      // Trigger input events
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    },
    args: [selector, value],
  });
}

/**
 * Wait for a duration
 */
async function wait(duration) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

/**
 * Make API call
 */
async function makeApiCall(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(endpoint, options);

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }

  return await response.text();
}

/**
 * Call integration action
 */
async function callIntegration(integration, action, input) {
  if (!extensionState.apiKey) {
    throw new Error('Not authenticated. Please set API key.');
  }

  const response = await fetch(`${GALAOS_API_URL}/integration/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${extensionState.apiKey}`,
    },
    body: JSON.stringify({
      integration,
      action,
      input,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Integration call failed: ${error.message || response.statusText}`);
  }

  return await response.json();
}

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[GalaOS] Message received:', message.type);

  switch (message.type) {
    case 'GET_STATE':
      sendResponse(extensionState);
      break;

    case 'SET_API_KEY':
      extensionState.apiKey = message.apiKey;
      extensionState.isAuthenticated = true;
      chrome.storage.local.set({ state: extensionState });
      sendResponse({ success: true });
      break;

    case 'GET_TOOLS':
      sendResponse(extensionState.tools);
      break;

    case 'GET_INTEGRATIONS':
      sendResponse(extensionState.integrations);
      break;

    case 'EXECUTE_TOOL':
      executeTool(message.toolId, message.params).then(sendResponse);
      return true; // Will respond asynchronously

    case 'SAVE_WORKFLOW':
      extensionState.activeWorkflows.push(message.workflow);
      chrome.storage.local.set({ workflows: extensionState.activeWorkflows });
      sendResponse({ success: true });
      break;

    case 'GET_WORKFLOWS':
      sendResponse(extensionState.activeWorkflows);
      break;

    case 'RUN_WORKFLOW':
      const workflow = extensionState.activeWorkflows.find((w) => w.id === message.workflowId);
      if (workflow) {
        executeWorkflow(workflow)
          .then(() => sendResponse({ success: true }))
          .catch((error) => sendResponse({ success: false, error: error.message }));
      } else {
        sendResponse({ success: false, error: 'Workflow not found' });
      }
      return true; // Will respond asynchronously

    case 'DELETE_WORKFLOW':
      extensionState.activeWorkflows = extensionState.activeWorkflows.filter(
        (w) => w.id !== message.workflowId
      );
      chrome.storage.local.set({ workflows: extensionState.activeWorkflows });
      sendResponse({ success: true });
      break;

    case 'GET_ACTIVITY':
      // Return recent agent activity from memory
      sendResponse(
        extensionState.agentMemory.slice(-10).map((item) => ({
          title: item.action || 'Activity',
          timestamp: item.timestamp || Date.now(),
        }))
      );
      break;
  }
});

console.log('[GalaOS] Background service worker initialized');
