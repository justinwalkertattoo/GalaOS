import { z } from 'zod';
import {
  BaseIntegration,
  IntegrationConfig,
  IntegrationAction,
  OAuth2Credentials,
} from '../base';

/**
 * ⚠️  ROBINHOOD INTEGRATION IMPORTANT WARNINGS ⚠️
 *
 * This integration is for READ-ONLY portfolio data access only.
 * Trading operations are DISABLED by default for safety.
 *
 * CRITICAL SAFETY NOTES:
 * - DO NOT enable trading without explicit user consent
 * - ALWAYS confirm trades with user before execution
 * - Financial losses can occur from automated trading
 * - This integration is unofficial and not endorsed by Robinhood
 * - Use at your own risk
 * - Robinhood may change their API at any time
 *
 * RECOMMENDED USE:
 * - Portfolio monitoring and alerts
 * - Market data analysis
 * - Performance tracking
 * - Research and backtesting (with historical data)
 *
 * For production trading, use official broker APIs with proper risk management.
 */

export const ROBINHOOD_SAFETY_WARNING = `
⚠️  ROBINHOOD INTEGRATION SAFETY WARNING ⚠️

This integration provides READ-ONLY access to your Robinhood portfolio data.
Trading operations are DISABLED for safety.

NEVER enable automated trading without:
1. Understanding the risks of financial loss
2. Implementing proper risk management
3. Having explicit confirmation workflows
4. Testing thoroughly in paper trading first

Use this integration for:
✓ Portfolio monitoring
✓ Performance analysis
✓ Market research
✓ Educational purposes

DO NOT use for:
✗ Automated trading without safeguards
✗ High-frequency trading
✗ Untested strategies with real money

You are responsible for all trading decisions and losses.
`;

export class RobinhoodIntegration extends BaseIntegration {
  config: IntegrationConfig = {
    id: 'robinhood',
    name: 'Robinhood',
    description: 'Monitor portfolio and market data (READ-ONLY for safety)',
    authType: 'oauth2',
    authUrl: 'https://robinhood.com/oauth2/authorize',
    tokenUrl: 'https://api.robinhood.com/oauth2/token',
    scopes: ['read'], // Only read scope by default
    icon: '📈',
  };

  private readonly BASE_URL = 'https://api.robinhood.com';

  async test(): Promise<boolean> {
    try {
      await this.getAccount();
      return true;
    } catch {
      return false;
    }
  }

  async getAccount(): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch(`${this.BASE_URL}/accounts/`, {
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Robinhood API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async getPortfolio(): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const account = await this.getAccount();
    const accountNumber = account.results[0].account_number;

    const response = await fetch(
      `${this.BASE_URL}/portfolios/${accountNumber}/`,
      {
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Robinhood API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async getPositions(): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch(`${this.BASE_URL}/positions/`, {
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Robinhood API error: ${response.statusText}`);
    }

    const data = await response.json() as any;

    // Filter out zero quantity positions
    const activePositions = data.results.filter(
      (pos: any) => parseFloat(pos.quantity) > 0
    );

    return { results: activePositions };
  }

  async getOrders(data?: { status?: string }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const params = new URLSearchParams();
    if (data?.status) params.append('status', data.status);

    const response = await fetch(`${this.BASE_URL}/orders/?${params}`, {
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Robinhood API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async getInstrument(instrumentUrl: string): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch(instrumentUrl, {
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Robinhood API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async searchInstruments(query: string): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch(
      `${this.BASE_URL}/instruments/?query=${encodeURIComponent(query)}`,
      {
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Robinhood API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async getQuote(symbol: string): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const response = await fetch(
      `${this.BASE_URL}/quotes/${symbol.toUpperCase()}/`,
      {
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Robinhood API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async getHistoricals(data: {
    symbol: string;
    interval: '5minute' | '10minute' | 'hour' | 'day' | 'week';
    span: 'day' | 'week' | 'month' | 'year' | '5year';
  }): Promise<any> {
    const creds = this.credentials as OAuth2Credentials;
    if (!creds?.accessToken) throw new Error('Not authenticated');

    const params = new URLSearchParams({
      interval: data.interval,
      span: data.span,
    });

    const response = await fetch(
      `${this.BASE_URL}/marketdata/historicals/${data.symbol.toUpperCase()}/?${params}`,
      {
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Robinhood API error: ${response.statusText}`);
    }

    return await response.json();
  }

  // Trading operations are commented out for safety
  // Uncomment only after implementing proper safeguards
  /*
  async placeOrder(data: {
    symbol: string;
    quantity: number;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    price?: number;
    timeInForce?: 'gfd' | 'gtc' | 'ioc' | 'opg';
  }): Promise<any> {
    throw new Error(
      'Trading operations are disabled for safety. ' +
      'Enable only after implementing proper safeguards and user confirmation.'
    );
  }
  */
}

// Robinhood Actions (READ-ONLY)
export const robinhoodGetPortfolioAction: IntegrationAction = {
  name: 'get_portfolio',
  description: 'Get portfolio summary and total value',
  inputSchema: z.object({}),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new RobinhoodIntegration();
    integration.setCredentials(credentials);
    return await integration.getPortfolio();
  },
};

export const robinhoodGetPositionsAction: IntegrationAction = {
  name: 'get_positions',
  description: 'Get all active positions in portfolio',
  inputSchema: z.object({}),
  outputSchema: z.object({
    results: z.array(z.any()),
  }),
  async execute(input, credentials) {
    const integration = new RobinhoodIntegration();
    integration.setCredentials(credentials);
    return await integration.getPositions();
  },
};

export const robinhoodGetOrdersAction: IntegrationAction = {
  name: 'get_orders',
  description: 'Get order history',
  inputSchema: z.object({
    status: z.string().optional(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new RobinhoodIntegration();
    integration.setCredentials(credentials);
    return await integration.getOrders(input);
  },
};

export const robinhoodSearchInstrumentsAction: IntegrationAction = {
  name: 'search_instruments',
  description: 'Search for stocks by name or symbol',
  inputSchema: z.object({
    query: z.string(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new RobinhoodIntegration();
    integration.setCredentials(credentials);
    return await integration.searchInstruments(input.query);
  },
};

export const robinhoodGetQuoteAction: IntegrationAction = {
  name: 'get_quote',
  description: 'Get real-time quote for a stock',
  inputSchema: z.object({
    symbol: z.string(),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new RobinhoodIntegration();
    integration.setCredentials(credentials);
    return await integration.getQuote(input.symbol);
  },
};

export const robinhoodGetHistoricalsAction: IntegrationAction = {
  name: 'get_historicals',
  description: 'Get historical price data for a stock',
  inputSchema: z.object({
    symbol: z.string(),
    interval: z.enum(['5minute', '10minute', 'hour', 'day', 'week']),
    span: z.enum(['day', 'week', 'month', 'year', '5year']),
  }),
  outputSchema: z.any(),
  async execute(input, credentials) {
    const integration = new RobinhoodIntegration();
    integration.setCredentials(credentials);
    return await integration.getHistoricals(input);
  },
};
