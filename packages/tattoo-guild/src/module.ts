/**
 * Tattoo Guild Module
 *
 * GalaOS business module for tattoo artists and studios.
 * Provides client management, design portfolio, Instagram automation,
 * appointment scheduling, and revenue tracking.
 */

import type { TattooGuildConfig } from './types';

export interface BusinessModuleDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  icon: string;

  // Module metadata
  author: string;
  website?: string;
  repository?: string;

  // Default configuration
  defaultConfig: Record<string, any>;

  // Routes to register
  routes: ModuleRoute[];

  // Workflows to install
  workflows: WorkflowTemplate[];

  // Databases to create
  databases: DatabaseTemplate[];

  // Required integrations
  requiredIntegrations?: string[];

  // Lifecycle hooks
  onInstall?: (workspaceId: string, config: any) => Promise<void>;
  onUninstall?: (workspaceId: string) => Promise<void>;
  onActivate?: (workspaceId: string) => Promise<void>;
  onDeactivate?: (workspaceId: string) => Promise<void>;
}

export interface ModuleRoute {
  path: string;
  name: string;
  description?: string;
  icon?: string;
  component: string;
  requiredRole?: 'owner' | 'admin' | 'member' | 'viewer';
  isPublic?: boolean;
  order?: number;
}

export interface WorkflowTemplate {
  name: string;
  description: string;
  category: string;
  template: any; // Workflow definition
  trigger?: any; // Trigger configuration
}

export interface DatabaseTemplate {
  name: string;
  description?: string;
  icon?: string;
  schema: DatabaseProperty[];
  templateData?: any[];
}

export interface DatabaseProperty {
  name: string;
  type: 'text' | 'number' | 'select' | 'multi_select' | 'date' | 'checkbox' | 'url' | 'email' | 'phone' | 'file' | 'relation';
  options?: string[];
  required?: boolean;
  defaultValue?: any;
}

/**
 * Tattoo Guild Module Definition
 */
export const TattooGuildModule: BusinessModuleDefinition = {
  id: 'tattoo-guild',
  name: 'Tattoo Guild',
  description: 'Complete business management system for tattoo artists and studios',
  version: '1.0.0',
  icon: '🎨',
  author: 'GalaOS',
  repository: 'https://github.com/justinwalkertattoo/GalaOS',

  defaultConfig: {
    studioName: 'Justin Walker Tattoo',
    timezone: 'America/Los_Angeles',
    currency: 'USD',
    defaultSessionDuration: 180, // 3 hours
    depositPercentage: 50,
    instagramAutoPost: true,
    instagramHashtags: [
      '#tattoo',
      '#tattooartist',
      '#ink',
      '#inked',
      '#tattooed',
      '#customtattoo',
    ],
    workDays: [1, 2, 3, 4, 5], // Monday-Friday
    workHours: {
      start: '10:00',
      end: '18:00',
    },
    bookingBuffer: 30,
    flashSaleEnabled: true,
  } as TattooGuildConfig,

  routes: [
    {
      path: '/tattoo-guild',
      name: 'Dashboard',
      description: 'Overview of your tattoo business',
      icon: '📊',
      component: 'tattoo-guild/Dashboard',
      order: 0,
    },
    {
      path: '/tattoo-guild/clients',
      name: 'Clients',
      description: 'Manage your client relationships',
      icon: '👥',
      component: 'tattoo-guild/ClientList',
      order: 1,
    },
    {
      path: '/tattoo-guild/appointments',
      name: 'Appointments',
      description: 'Schedule and manage appointments',
      icon: '📅',
      component: 'tattoo-guild/AppointmentCalendar',
      order: 2,
    },
    {
      path: '/tattoo-guild/designs',
      name: 'Designs',
      description: 'Your design portfolio',
      icon: '🎨',
      component: 'tattoo-guild/DesignGallery',
      order: 3,
    },
    {
      path: '/tattoo-guild/flash',
      name: 'Flash',
      description: 'Manage flash designs and sales',
      icon: '⚡',
      component: 'tattoo-guild/FlashManager',
      order: 4,
    },
    {
      path: '/tattoo-guild/instagram',
      name: 'Instagram',
      description: 'Social media automation',
      icon: '📸',
      component: 'tattoo-guild/InstagramManager',
      order: 5,
    },
    {
      path: '/tattoo-guild/revenue',
      name: 'Revenue',
      description: 'Track income and expenses',
      icon: '💰',
      component: 'tattoo-guild/RevenueTracker',
      order: 6,
    },
    {
      path: '/tattoo-guild/settings',
      name: 'Settings',
      description: 'Configure your studio settings',
      icon: '⚙️',
      component: 'tattoo-guild/Settings',
      requiredRole: 'admin',
      order: 7,
    },
  ],

  workflows: [
    {
      name: 'Client Onboarding',
      description: 'Automated workflow for new client onboarding',
      category: 'client-management',
      template: {
        nodes: [
          {
            id: 'trigger',
            type: 'trigger',
            data: { event: 'client.created' },
          },
          {
            id: 'send-welcome',
            type: 'action',
            data: {
              action: 'sendEmail',
              template: 'client-welcome',
            },
          },
          {
            id: 'create-folder',
            type: 'action',
            data: {
              action: 'createFolder',
              name: 'Client - {{client.name}}',
            },
          },
        ],
        edges: [
          { source: 'trigger', target: 'send-welcome' },
          { source: 'send-welcome', target: 'create-folder' },
        ],
      },
      trigger: {
        type: 'database',
        database: 'clients',
        event: 'created',
      },
    },
    {
      name: 'Appointment Reminder',
      description: 'Send reminder 24 hours before appointment',
      category: 'client-management',
      template: {
        nodes: [
          {
            id: 'trigger',
            type: 'schedule',
            data: { cron: '0 10 * * *' }, // Daily at 10am
          },
          {
            id: 'find-appointments',
            type: 'query',
            data: {
              database: 'appointments',
              filter: 'date = tomorrow AND status = confirmed',
            },
          },
          {
            id: 'send-reminder',
            type: 'action',
            data: {
              action: 'sendSMS',
              template: 'appointment-reminder',
            },
          },
        ],
        edges: [
          { source: 'trigger', target: 'find-appointments' },
          { source: 'find-appointments', target: 'send-reminder' },
        ],
      },
      trigger: {
        type: 'schedule',
        cron: '0 10 * * *',
      },
    },
    {
      name: 'Instagram Flash Post',
      description: 'Automatically post flash designs to Instagram',
      category: 'instagram',
      template: {
        nodes: [
          {
            id: 'trigger',
            type: 'trigger',
            data: { event: 'flash.created' },
          },
          {
            id: 'generate-caption',
            type: 'ai',
            data: {
              prompt: 'Generate engaging Instagram caption for this flash tattoo design',
              model: 'claude-3-5-sonnet-20241022',
            },
          },
          {
            id: 'add-watermark',
            type: 'action',
            data: {
              action: 'addWatermark',
              position: 'bottom-right',
            },
          },
          {
            id: 'post-instagram',
            type: 'integration',
            data: {
              integration: 'instagram',
              action: 'createPost',
            },
          },
        ],
        edges: [
          { source: 'trigger', target: 'generate-caption' },
          { source: 'generate-caption', target: 'add-watermark' },
          { source: 'add-watermark', target: 'post-instagram' },
        ],
      },
      trigger: {
        type: 'database',
        database: 'flash',
        event: 'created',
      },
    },
    {
      name: 'Monthly Revenue Report',
      description: 'Generate monthly revenue summary',
      category: 'revenue',
      template: {
        nodes: [
          {
            id: 'trigger',
            type: 'schedule',
            data: { cron: '0 9 1 * *' }, // First of month at 9am
          },
          {
            id: 'query-revenue',
            type: 'query',
            data: {
              database: 'revenue',
              filter: 'date >= lastMonth',
            },
          },
          {
            id: 'generate-report',
            type: 'ai',
            data: {
              prompt: 'Generate revenue analysis report with insights and trends',
              model: 'claude-3-5-sonnet-20241022',
            },
          },
          {
            id: 'send-report',
            type: 'action',
            data: {
              action: 'sendEmail',
              template: 'monthly-revenue-report',
            },
          },
        ],
        edges: [
          { source: 'trigger', target: 'query-revenue' },
          { source: 'query-revenue', target: 'generate-report' },
          { source: 'generate-report', target: 'send-report' },
        ],
      },
      trigger: {
        type: 'schedule',
        cron: '0 9 1 * *',
      },
    },
  ],

  databases: [
    {
      name: 'Clients',
      description: 'Client database for tattoo studio',
      icon: '👥',
      schema: [
        { name: 'Name', type: 'text', required: true },
        { name: 'Email', type: 'email' },
        { name: 'Phone', type: 'phone' },
        { name: 'Instagram', type: 'text' },
        { name: 'First Visit', type: 'date', required: true, defaultValue: 'today' },
        { name: 'Last Visit', type: 'date' },
        { name: 'Total Sessions', type: 'number', defaultValue: 0 },
        { name: 'Total Revenue', type: 'number', defaultValue: 0 },
        { name: 'Photo Consent', type: 'checkbox', defaultValue: false },
        { name: 'Style Preferences', type: 'multi_select', options: ['Traditional', 'Neo-Traditional', 'Realism', 'Blackwork', 'Color', 'Fine Line', 'Geometric', 'Japanese', 'Tribal'] },
        { name: 'Tags', type: 'multi_select', options: ['VIP', 'Repeat Client', 'Referral', 'New', 'No-Show Risk'] },
        { name: 'Notes', type: 'text' },
      ],
    },
    {
      name: 'Designs',
      description: 'Portfolio of tattoo designs',
      icon: '🎨',
      schema: [
        { name: 'Title', type: 'text', required: true },
        { name: 'Description', type: 'text' },
        { name: 'Category', type: 'select', options: ['Flash', 'Custom', 'Commission'], required: true },
        { name: 'Style', type: 'multi_select', options: ['Traditional', 'Neo-Traditional', 'Realism', 'Blackwork', 'Color', 'Fine Line', 'Geometric', 'Japanese', 'Tribal'] },
        { name: 'Placement', type: 'multi_select', options: ['Arm', 'Leg', 'Back', 'Chest', 'Shoulder', 'Forearm', 'Calf', 'Thigh', 'Ribs', 'Hand', 'Neck'] },
        { name: 'Estimated Time', type: 'number' },
        { name: 'Price', type: 'number' },
        { name: 'Image', type: 'file' },
        { name: 'Status', type: 'select', options: ['Draft', 'Available', 'Reserved', 'Completed'], defaultValue: 'Draft' },
        { name: 'Tags', type: 'multi_select', options: ['Popular', 'Featured', 'Seasonal', 'Limited', 'Sold'] },
      ],
    },
    {
      name: 'Appointments',
      description: 'Appointment scheduling',
      icon: '📅',
      schema: [
        { name: 'Client', type: 'relation', required: true },
        { name: 'Design', type: 'relation' },
        { name: 'Date', type: 'date', required: true },
        { name: 'Duration', type: 'number', defaultValue: 180 },
        { name: 'Status', type: 'select', options: ['Scheduled', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'No-Show'], defaultValue: 'Scheduled' },
        { name: 'Deposit', type: 'number' },
        { name: 'Total Price', type: 'number' },
        { name: 'Notes', type: 'text' },
        { name: 'Reminder Sent', type: 'checkbox', defaultValue: false },
        { name: 'Photos', type: 'file' },
      ],
    },
    {
      name: 'Flash',
      description: 'Flash designs and sales',
      icon: '⚡',
      schema: [
        { name: 'Design', type: 'relation', required: true },
        { name: 'Available', type: 'checkbox', defaultValue: true },
        { name: 'Original Price', type: 'number', required: true },
        { name: 'Sale Price', type: 'number' },
        { name: 'Expires At', type: 'date' },
        { name: 'Sold At', type: 'date' },
        { name: 'Sold To', type: 'relation' },
        { name: 'Instagram Post ID', type: 'text' },
        { name: 'Posted At', type: 'date' },
        { name: 'Views', type: 'number', defaultValue: 0 },
        { name: 'Inquiries', type: 'number', defaultValue: 0 },
      ],
    },
    {
      name: 'Revenue',
      description: 'Revenue tracking',
      icon: '💰',
      schema: [
        { name: 'Date', type: 'date', required: true, defaultValue: 'today' },
        { name: 'Client', type: 'relation' },
        { name: 'Appointment', type: 'relation' },
        { name: 'Amount', type: 'number', required: true },
        { name: 'Type', type: 'select', options: ['Session', 'Deposit', 'Flash', 'Merchandise', 'Other'], required: true },
        { name: 'Payment Method', type: 'select', options: ['Cash', 'Card', 'Venmo', 'CashApp', 'Other'], required: true },
        { name: 'Notes', type: 'text' },
      ],
    },
  ],

  requiredIntegrations: ['instagram'],

  async onInstall(workspaceId: string, config: TattooGuildConfig) {
    console.log(`Installing Tattoo Guild for workspace ${workspaceId}`);
    // Initialize databases with seed data if needed
    // Set up default workflows
    // Configure integrations
  },

  async onUninstall(workspaceId: string) {
    console.log(`Uninstalling Tattoo Guild from workspace ${workspaceId}`);
    // Clean up databases
    // Remove workflows
    // Disconnect integrations
  },

  async onActivate(workspaceId: string) {
    console.log(`Activating Tattoo Guild for workspace ${workspaceId}`);
    // Enable workflows
    // Sync integrations
  },

  async onDeactivate(workspaceId: string) {
    console.log(`Deactivating Tattoo Guild for workspace ${workspaceId}`);
    // Pause workflows
    // Disconnect integrations
  },
};
