import type { Browser, Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';

export interface BrowserSession {
  id: string;
  providerId: string;
  browser?: Browser;
  page?: Page;
  cookies?: any[];
  status: 'initializing' | 'authenticated' | 'ready' | 'error';
}

/**
 * Browser Automation Integration
 *
 * WARNING: This is EXPERIMENTAL and may violate Terms of Service!
 * Use browser automation to access AI services through their web interfaces.
 *
 * ⚠️  IMPORTANT DISCLAIMERS:
 * - This may violate provider Terms of Service
 * - Use at your own risk
 * - Only use with your own personal account
 * - Provider may block or ban your account
 * - This is a temporary solution until OAuth is available
 * - Prefer official APIs when possible
 *
 * Use cases:
 * - ChatGPT Plus users who want to use their subscription instead of API
 * - Claude Pro users who want to use their existing account
 * - Testing before buying API access
 */
export class BrowserIntegration {
  private sessions: Map<string, BrowserSession> = new Map();
  private cookieDir: string;

  constructor(cookieDir: string = './.galaos-browser-sessions') {
    this.cookieDir = cookieDir;
    if (!fs.existsSync(cookieDir)) {
      fs.mkdirSync(cookieDir, { recursive: true });
    }
  }

  private async getPuppeteer() {
    const enabled = String(process.env.BROWSER_AUTOMATION_ENABLED || '').toLowerCase() === 'true';
    if (!enabled) {
      throw new Error('Browser automation is disabled. Set BROWSER_AUTOMATION_ENABLED=true to enable.');
    }
    try {
      const mod = await import('puppeteer');
      return (mod as any).default || mod;
    } catch (e) {
      throw new Error('Puppeteer is not available in this environment. Ensure dependencies and runtime libs are installed.');
    }
  }

  /**
   * Initialize browser session for ChatGPT
   */
  async initializeChatGPT(userId: string): Promise<{ loginUrl: string; sessionId: string }> {
    const sessionId = `chatgpt-${userId}-${Date.now()}`;

    const puppeteer = await this.getPuppeteer();
    const browser = await puppeteer.launch({
      headless: false, // User needs to see login
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    const session: BrowserSession = {
      id: sessionId,
      providerId: 'chatgpt-web',
      browser,
      page,
      status: 'initializing',
    };

    this.sessions.set(sessionId, session);

    // Navigate to ChatGPT login
    await page.goto('https://chat.openai.com/auth/login');

    return {
      loginUrl: 'https://chat.openai.com/auth/login',
      sessionId,
    };
  }

  /**
   * Initialize browser session for Claude
   */
  async initializeClaude(userId: string): Promise<{ loginUrl: string; sessionId: string }> {
    const sessionId = `claude-${userId}-${Date.now()}`;

    const puppeteer = await this.getPuppeteer();
    const browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    const session: BrowserSession = {
      id: sessionId,
      providerId: 'claude-web',
      browser,
      page,
      status: 'initializing',
    };

    this.sessions.set(sessionId, session);

    // Navigate to Claude login
    await page.goto('https://claude.ai/login');

    return {
      loginUrl: 'https://claude.ai/login',
      sessionId,
    };
  }

  /**
   * Wait for user to complete login
   * Returns true when authenticated
   */
  async waitForAuthentication(sessionId: string, timeoutMs: number = 300000): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.page) {
      throw new Error('Session not found');
    }

    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        if (session.providerId === 'chatgpt-web') {
          // Check if we're on the chat page
          const url = session.page.url();
          if (url.includes('chat.openai.com') && !url.includes('/auth/')) {
            session.status = 'authenticated';
            await this.saveCookies(sessionId);
            return true;
          }
        } else if (session.providerId === 'claude-web') {
          // Check if we're authenticated
          const url = session.page.url();
          if (url.includes('claude.ai') && !url.includes('/login')) {
            session.status = 'authenticated';
            await this.saveCookies(sessionId);
            return true;
          }
        }
      } catch (error) {
        // Continue waiting
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return false;
  }

  /**
   * Send message to ChatGPT
   */
  async sendChatGPTMessage(sessionId: string, message: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.page) {
      throw new Error('Session not found');
    }

    if (session.status !== 'authenticated' && session.status !== 'ready') {
      throw new Error('Session not authenticated');
    }

    const page = session.page;

    try {
      // Find textarea and type message
      await page.waitForSelector('textarea', { timeout: 5000 });
      await page.type('textarea', message);

      // Submit (look for send button or press Enter)
      await page.keyboard.press('Enter');

      // Wait for response
      await page.waitForSelector('[data-message-author-role="assistant"]', {
        timeout: 60000,
      });

      // Get latest assistant message
      const messages = await page.$$('[data-message-author-role="assistant"]');
      const lastMessage = messages[messages.length - 1];

      const responseText = await page.evaluate((el: any) => el?.textContent || '', lastMessage);

      return responseText;
    } catch (error: any) {
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  /**
   * Send message to Claude
   */
  async sendClaudeMessage(sessionId: string, message: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.page) {
      throw new Error('Session not found');
    }

    if (session.status !== 'authenticated' && session.status !== 'ready') {
      throw new Error('Session not authenticated');
    }

    const page = session.page;

    try {
      // Find input field and type message
      await page.waitForSelector('[contenteditable="true"]', { timeout: 5000 });
      await page.type('[contenteditable="true"]', message);

      // Submit
      await page.keyboard.press('Enter');

      // Wait for response (Claude's UI is different)
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for response to start

      // Wait for response to complete (look for stop button to disappear)
      try {
        await page.waitForSelector('[aria-label="Stop generating"]', { timeout: 5000 });
        await page.waitForSelector('[aria-label="Stop generating"]', {
          hidden: true,
          timeout: 60000,
        });
      } catch (error) {
        // Button might not appear if response is quick
      }

      // Get latest Claude message
      // This selector may need adjustment based on Claude's current UI
      const response = await page.evaluate(`() => {
        const messages = document.querySelectorAll('[data-role="message"]');
        const lastMessage = messages[messages.length - 1];
        return lastMessage?.textContent || '';
      }`) as string;

      return response;
    } catch (error: any) {
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  /**
   * Save cookies for session persistence
   */
  private async saveCookies(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.page) {
      return;
    }

    const cookies = await session.page.cookies();
    session.cookies = cookies;

    const cookiePath = path.join(this.cookieDir, `${sessionId}.json`);
    fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2));
  }

  /**
   * Load cookies from saved session
   */
  async loadCookies(sessionId: string): Promise<boolean> {
    const cookiePath = path.join(this.cookieDir, `${sessionId}.json`);

    if (!fs.existsSync(cookiePath)) {
      return false;
    }

    const session = this.sessions.get(sessionId);
    if (!session || !session.page) {
      return false;
    }

    const cookiesString = fs.readFileSync(cookiePath, 'utf-8');
    const cookies = JSON.parse(cookiesString);

    await session.page.setCookie(...cookies);
    session.cookies = cookies;

    return true;
  }

  /**
   * Close browser session
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session && session.browser) {
      await session.browser.close();
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Get session status
   */
  getSessionStatus(sessionId: string): BrowserSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Clean up all sessions
   */
  async cleanup(): Promise<void> {
    for (const [sessionId, session] of this.sessions) {
      if (session.browser) {
        await session.browser.close();
      }
    }
    this.sessions.clear();
  }
}

/**
 * Terms of Service Compliance Check
 *
 * Before using browser automation, users should:
 * 1. Read the provider's Terms of Service
 * 2. Understand the risks
 * 3. Only use with their own personal account
 * 4. Be prepared for account suspension
 *
 * Recommended: Wait for official OAuth support or use API keys
 */
export const TOS_WARNING = `
⚠️  BROWSER AUTOMATION WARNING ⚠️

This feature uses browser automation to access AI services through their web interfaces.

IMPORTANT CONSIDERATIONS:
✗ May violate the provider's Terms of Service
✗ Your account could be suspended or banned
✗ This is NOT officially supported by the provider
✗ Features may break when the provider updates their UI
✗ Less reliable than official APIs

✓ Use this ONLY if:
  - You have a paid subscription (ChatGPT Plus, Claude Pro)
  - You want to use your existing subscription instead of API
  - You accept all risks
  - You are using YOUR OWN account only

RECOMMENDATION:
Use official API keys when possible. This is a temporary solution
until providers offer OAuth/integration support.

Do you accept these risks and terms?
`;
