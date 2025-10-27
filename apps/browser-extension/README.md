# GalaOS Browser Extension

AI-powered browser extension that brings GalaOS capabilities directly into your browser.

## Features

### 🤖 AI Agent in Your Browser
- **Page Analysis**: Comprehensive AI analysis of any webpage
- **Smart Summarization**: Instant summaries of articles and content
- **Data Extraction**: Intelligent extraction of tables, lists, images, and links
- **Context-Aware Chat**: Chat with AI about the current page

### ⚡ Quick Actions
- **Right-Click Menu**: Context menu integration for instant actions
- **Keyboard Shortcuts**:
  - `Ctrl+Shift+G` (Mac: `Cmd+Shift+G`) - Open AI Agent
  - `Ctrl+Shift+A` (Mac: `Cmd+Shift+A`) - Analyze current page
  - `Ctrl+Shift+W` (Mac: `Cmd+Shift+W`) - Run workflow
  - `Ctrl+Shift+C` (Mac: `Cmd+Shift+C`) - Capture page context

### 🔗 Integration Access
Direct access to all 40+ GalaOS integrations:
- Send selections to **Notion**
- Post to **Slack** channels
- Create **GitHub** issues
- Export data to any connected service

### 🔄 Workflow Automation
- **Multi-step Workflows**: Create complex automation sequences
- **Scheduled Execution**: Run workflows on a schedule
- **Form Filling**: Auto-fill forms with saved data
- **Page Monitoring**: Monitor pages for changes

## Installation

### From Chrome Web Store (Coming Soon)
1. Visit Chrome Web Store
2. Search for "GalaOS AI Agent"
3. Click "Add to Chrome"

### Manual Installation (Developer Mode)

#### Chrome/Brave/Edge
1. Clone the GalaOS repository
   ```bash
   git clone https://github.com/justinwalkertattoo/GalaOS
   cd GalaOS/apps/browser-extension
   ```

2. Build the extension (if not already built)
   ```bash
   pnpm install
   pnpm build
   ```

3. Open Chrome and navigate to `chrome://extensions/`

4. Enable "Developer mode" (toggle in top right)

5. Click "Load unpacked"

6. Select the `apps/browser-extension` directory

7. The GalaOS icon should appear in your extensions

#### Firefox
1. Clone the GalaOS repository
   ```bash
   git clone https://github.com/justinwalkertattoo/GalaOS
   cd GalaOS/apps/browser-extension
   ```

2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`

3. Click "Load Temporary Add-on"

4. Select the `manifest.json` file from `apps/browser-extension`

5. The extension will be active until you close Firefox

## Configuration

### 1. Get Your API Key
1. Visit [GalaOS Dashboard](https://galaos.app)
2. Go to Settings → API Keys
3. Create a new API key
4. Copy the key (starts with `sk-galaos-`)

### 2. Connect the Extension
1. Click the GalaOS icon in your browser toolbar
2. Enter your API key
3. Click "Connect"
4. You're ready to go! 🎉

### 3. Connect Integrations (Optional)
1. Open extension popup
2. Go to Settings
3. Connect the integrations you want to use
4. Authorize each integration

## Usage

### Quick Start

#### Analyze Any Page
1. Navigate to any webpage
2. Press `Ctrl+Shift+A` (or `Cmd+Shift+A` on Mac)
3. View AI-generated insights in the panel

#### Chat with AI About Page
1. Click the GalaOS icon or press `Ctrl+Shift+G`
2. Type your question in the chat
3. AI responds with context from the current page

#### Extract Data
1. Right-click on the page
2. Select "GalaOS AI Agent" → "Extract Data"
3. View extracted tables, lists, and structured data
4. Export as JSON

### Advanced Features

#### Create Custom Workflows
```javascript
{
  name: "Save to Notion Daily",
  schedule: { interval: 1440 }, // Run daily
  steps: [
    { type: "navigate", url: "https://news.site.com" },
    { type: "extract", selector: ".article" },
    {
      type: "integration",
      integration: "notion",
      action: "create_page",
      params: {
        parentId: "your-notion-page-id",
        title: "Daily News Digest",
        content: "{{extracted_content}}"
      }
    }
  ]
}
```

#### Use with Integrations
```javascript
// Send selected text to Slack
1. Select text on any page
2. Right-click → GalaOS AI Agent → Send to Slack
3. Choose channel
4. Message posted!

// Create GitHub Issue from Selection
1. Select bug description
2. Right-click → GalaOS AI Agent → Create GitHub Issue
3. Issue created with selected text
```

## Architecture

### Components

```
browser-extension/
├── manifest.json           # Extension manifest (Manifest V3)
├── background.js          # Background service worker
├── content.js             # Content script (injected into pages)
├── content.css            # Content script styles
├── popup/
│   ├── popup.html        # Extension popup UI
│   ├── popup.css         # Popup styles
│   └── popup.js          # Popup logic
├── sidepanel/
│   ├── sidepanel.html    # Side panel UI
│   └── sidepanel.js      # Side panel logic
├── options/
│   ├── options.html      # Settings page
│   └── options.js        # Settings logic
└── icons/                # Extension icons
```

### Communication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Content   │────▶│ Background  │────▶│   GalaOS    │
│   Script    │◀────│   Worker    │◀────│     API     │
└─────────────┘     └─────────────┘     └─────────────┘
      │                    │                    │
      │                    │                    │
   ┌──▼──┐            ┌────▼────┐        ┌─────▼─────┐
   │ DOM │            │ Storage │        │Integration│
   └─────┘            └─────────┘        └───────────┘
```

### Security

- **API Key Encryption**: API keys stored encrypted in browser storage
- **HTTPS Only**: All API communication over HTTPS
- **Content Security Policy**: Strict CSP to prevent XSS
- **Minimal Permissions**: Only requests necessary permissions
- **OAuth Support**: OAuth for integration connections

## Development

### Build from Source

```bash
# Install dependencies
pnpm install

# Development mode (with hot reload)
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint
```

### Project Structure

```typescript
// background.js - Background service worker
- Handles API communication
- Manages extension state
- Coordinates workflows
- Processes messages from content scripts

// content.js - Content script
- Injected into every webpage
- Provides floating AI panel
- Captures page context
- Executes page actions

// popup.js - Extension popup
- Quick actions
- Integration status
- Recent activity
- Settings access
```

### Adding New Features

1. **Add Action to Content Script**
   ```javascript
   // content.js
   async function newAction() {
     // Your action logic
   }
   ```

2. **Add UI in Popup**
   ```html
   <!-- popup.html -->
   <button class="action-card" data-action="new-action">
     <span class="action-icon">🎯</span>
     <span class="action-label">New Action</span>
   </button>
   ```

3. **Handle in Background**
   ```javascript
   // background.js
   case 'NEW_ACTION':
     await handleNewAction(message);
     break;
   ```

## Troubleshooting

### Extension Not Loading
- Ensure you're in Developer Mode
- Check that all files are present
- Look for errors in `chrome://extensions/`
- Try removing and re-adding the extension

### API Connection Issues
- Verify your API key is correct
- Check that GalaOS API is accessible
- Look at browser console for error messages
- Ensure you're connected to the internet

### Features Not Working
- Refresh the page after installing
- Check that required permissions are granted
- Verify integrations are connected
- Look for error messages in DevTools

### Performance Issues
- Close unused tabs
- Clear extension cache: Settings → Clear Cache
- Disable unnecessary integrations
- Reduce workflow frequency

## Privacy & Permissions

### Required Permissions

- **`storage`**: Store API keys and settings
- **`tabs`**: Access current tab information
- **`activeTab`**: Interact with the active page
- **`scripting`**: Inject content scripts
- **`contextMenus`**: Add right-click menu items
- **`notifications`**: Show completion notifications

### Data Collection

GalaOS extension does NOT collect or store:
- Browsing history
- Personal information
- Page content (except when explicitly analyzed)
- Form data
- Cookies

Data sent to GalaOS API:
- Page content (only when you use AI features)
- User prompts and queries
- Integration action requests
- Workflow execution data

All data transmission is encrypted (HTTPS) and processed according to the [GalaOS Privacy Policy](https://galaos.app/privacy).

## Support

- **Documentation**: https://docs.galaos.app/browser-extension
- **Issues**: https://github.com/justinwalkertattoo/GalaOS/issues
- **Discord**: https://discord.gg/galaos
- **Email**: support@galaos.app

## License

MIT License - see [LICENSE](../../LICENSE) for details

## Changelog

### Version 1.0.0 (2025-01-XX)
- ✨ Initial release
- 🤖 AI page analysis
- 💬 Context-aware chat
- 🔍 Smart data extraction
- 🔄 Workflow automation
- 🔗 40+ integrations support
- ⌨️ Keyboard shortcuts
- 📱 Right-click context menu
- 🎨 Beautiful UI with dark mode
- 🔒 Secure API key storage

---

**Made with ❤️ by the GalaOS Team**
