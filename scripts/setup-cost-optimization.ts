/**
 * Setup Script: Configure Cost Optimization
 *
 * Sets up conservative API quotas and validates Ollama models
 */

import { PrismaClient } from '@galaos/db';
import { ApiUsageTracker } from '@galaos/core/src/api-usage-tracker';
import { CONSERVATIVE_QUOTAS } from '../packages/ai/src/cost-optimized-provider';

const prisma = new PrismaClient();
const tracker = new ApiUsageTracker(prisma);

/**
 * Check if Ollama is running and models are available
 */
async function checkOllamaModels() {
  const endpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';

  console.log('🔍 Checking Ollama availability...');

  try {
    const response = await fetch(`${endpoint}/api/tags`);
    if (!response.ok) {
      throw new Error('Ollama not responding');
    }

    const data = await response.json();
    const models = data.models || [];

    console.log('✅ Ollama is running!');
    console.log(`📦 Found ${models.length} models:\n`);

    const expectedModels = [
      'nomic-embed-text',
      'qwen2.5-coder',
      'llama3.1',
      'gpt-oss:20b',
      'llava',
      'codellama',
      'qwen3',
      'deepseek-r1',
      'mistral-small3.1',
      'gemma3',
    ];

    const found: string[] = [];
    const missing: string[] = [];

    for (const expected of expectedModels) {
      const exists = models.some((m: any) =>
        m.name.toLowerCase().includes(expected.toLowerCase())
      );
      if (exists) {
        found.push(expected);
        console.log(`  ✅ ${expected}`);
      } else {
        missing.push(expected);
        console.log(`  ⚠️  ${expected} - NOT FOUND`);
      }
    }

    console.log(`\n📊 Summary: ${found.length}/${expectedModels.length} models available`);

    if (missing.length > 0) {
      console.log('\n💡 To install missing models, run:');
      missing.forEach((m) => {
        console.log(`   ollama pull ${m}`);
      });
    }

    return { found, missing, total: models.length };
  } catch (error: any) {
    console.error('❌ Ollama is not running or not accessible');
    console.error('   Make sure Ollama is installed and running:');
    console.error('   1. Install: curl https://ollama.ai/install.sh | sh');
    console.error('   2. Start: ollama serve');
    console.error(`   3. Check endpoint: ${endpoint}`);
    throw error;
  }
}

/**
 * Setup conservative API quotas
 */
async function setupQuotas(userId?: string) {
  console.log('\n🔧 Setting up conservative API quotas...');

  const quotas = CONSERVATIVE_QUOTAS;

  // Setup for system default (userId = null)
  const setupForUser = async (uid: string | null, label: string) => {
    console.log(`\n📋 Configuring quotas for ${label}:`);

    // OpenAI
    await tracker.setQuota(uid || 'system', 'openai', {
      dailyLimit: quotas.daily.openai.dailyLimit,
      monthlyLimit: quotas.monthly.openai.monthlyLimit,
      dailyCostLimit: quotas.daily.openai.dailyCostLimit,
      monthlyCostLimit: quotas.monthly.openai.monthlyCostLimit,
      dailyTokenLimit: quotas.daily.openai.dailyTokenLimit,
      monthlyTokenLimit: quotas.monthly.openai.monthlyTokenLimit,
      alertOnThreshold: quotas.alertOnThreshold,
    });
    console.log('  ✅ OpenAI: $100/month max, 50 calls/day');

    // Anthropic
    await tracker.setQuota(uid || 'system', 'anthropic', {
      dailyLimit: quotas.daily.anthropic.dailyLimit,
      monthlyLimit: quotas.monthly.anthropic.monthlyLimit,
      dailyCostLimit: quotas.daily.anthropic.dailyCostLimit,
      monthlyCostLimit: quotas.monthly.anthropic.monthlyCostLimit,
      dailyTokenLimit: quotas.daily.anthropic.dailyTokenLimit,
      monthlyTokenLimit: quotas.monthly.anthropic.monthlyTokenLimit,
      alertOnThreshold: quotas.alertOnThreshold,
    });
    console.log('  ✅ Anthropic: $40/month max, 30 calls/day');

    // Gemini (backup)
    await tracker.setQuota(uid || 'system', 'gemini', {
      dailyLimit: quotas.daily.gemini.dailyLimit,
      monthlyLimit: quotas.monthly.gemini.monthlyLimit,
      dailyCostLimit: quotas.daily.gemini.dailyCostLimit,
      monthlyCostLimit: quotas.monthly.gemini.monthlyCostLimit,
      dailyTokenLimit: quotas.daily.gemini.dailyTokenLimit,
      monthlyTokenLimit: quotas.monthly.gemini.monthlyTokenLimit,
      alertOnThreshold: quotas.alertOnThreshold,
    });
    console.log('  ✅ Gemini: $15/month max, 20 calls/day');
  };

  // Setup system default
  await setupForUser(null, 'System Default');

  // Setup for specific user if provided
  if (userId) {
    await setupForUser(userId, `User: ${userId}`);
  }

  console.log('\n💰 Total monthly budget: $140 maximum');
  console.log('⚠️  Alerts will trigger at 70% ($98)');
}

/**
 * Display usage recommendations
 */
function displayRecommendations() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 COST OPTIMIZATION RECOMMENDATIONS');
  console.log('='.repeat(60));

  console.log('\n🎯 TASK-TO-MODEL MAPPING (Prioritize FREE local models):\n');

  const recommendations = [
    {
      task: 'Code Generation',
      primary: 'qwen2.5-coder (LOCAL)',
      fallback: 'codellama → llama3.1 → Haiku',
      cost: '$0',
      calls: '~1000/month',
    },
    {
      task: 'General Chat',
      primary: 'llama3.1 (LOCAL)',
      fallback: 'gemma3 → mistral-small3.1 → Haiku',
      cost: '$0',
      calls: '~2000/month',
    },
    {
      task: 'Reasoning',
      primary: 'deepseek-r1 (LOCAL)',
      fallback: 'gpt-oss:20b → llama3.1 → Sonnet',
      cost: '$0-5',
      calls: '~200/month',
    },
    {
      task: 'Document Analysis',
      primary: 'gpt-oss:20b (LOCAL)',
      fallback: 'mistral-small3.1 → Haiku',
      cost: '$0-2',
      calls: '~500/month',
    },
    {
      task: 'Quick Responses',
      primary: 'gemma3 (LOCAL)',
      fallback: 'llama3.1',
      cost: '$0',
      calls: '~3000/month',
    },
    {
      task: 'Vision/Images',
      primary: 'llava (LOCAL)',
      fallback: 'GPT-4 Vision (emergency)',
      cost: '$0-10',
      calls: '~100/month',
    },
    {
      task: 'Embeddings',
      primary: 'nomic-embed-text (LOCAL)',
      fallback: 'None needed',
      cost: '$0',
      calls: '~5000/month',
    },
  ];

  recommendations.forEach((rec) => {
    console.log(`${rec.task}:`);
    console.log(`  Primary:  ${rec.primary}`);
    console.log(`  Fallback: ${rec.fallback}`);
    console.log(`  Cost:     ${rec.cost}`);
    console.log(`  Volume:   ${rec.calls}`);
    console.log();
  });

  console.log('💡 COST SAVING TIPS:\n');
  console.log('1. Use qwen2.5-coder for ALL code tasks (saves $30-50/month)');
  console.log('2. Use llama3.1 for most chat/general tasks (saves $40-60/month)');
  console.log('3. Use gemma3 for quick, simple queries (very fast, FREE)');
  console.log('4. Reserve API calls for:');
  console.log('   - Production user-facing features only');
  console.log('   - Tasks where local models struggle');
  console.log('   - Critical quality requirements');
  console.log('5. Use nomic-embed-text for ALL embeddings (100% free)');

  console.log('\n📈 ESTIMATED MONTHLY COSTS:\n');
  console.log('Best case (95% local):     $0-5');
  console.log('Realistic (90% local):     $15-25');
  console.log('Heavy API use (80% local): $50-70');
  console.log('Maximum (quota limits):    $140');

  console.log('\n🎓 HOW TO USE:\n');
  console.log('// Import cost-optimized provider');
  console.log("import { CostOptimizedModelProvider } from '@galaos/ai/src/cost-optimized-provider';");
  console.log('');
  console.log('const provider = new CostOptimizedModelProvider();');
  console.log('');
  console.log('// For code tasks (uses qwen2.5-coder)');
  console.log("const codeModel = await provider.selectModelForTask(userId, 'code');");
  console.log('');
  console.log('// For chat tasks (uses llama3.1)');
  console.log("const chatModel = await provider.selectModelForTask(userId, 'chat');");
  console.log('');
  console.log('// For embeddings (uses nomic-embed-text)');
  console.log('const embedding = await provider.getEmbedding("Your text here");');

  console.log('\n🔍 MONITORING:\n');
  console.log('// Check current usage');
  console.log('const stats = await tracker.getUsageStats(userId);');
  console.log('console.log(stats.quotas);  // Current quotas');
  console.log('console.log(stats.alerts);  // Active alerts');
  console.log('');
  console.log('// View recent API calls');
  console.log('console.log(stats.recentLogs); // Last 100 calls');
}

/**
 * Main setup function
 */
async function main() {
  console.log('🚀 GalaOS Cost Optimization Setup\n');

  try {
    // Step 1: Check Ollama
    const ollamaStatus = await checkOllamaModels();

    // Step 2: Setup quotas
    await setupQuotas();

    // Step 3: Display recommendations
    displayRecommendations();

    console.log('\n✅ Setup complete!\n');
    console.log('Your system is configured to:');
    console.log('  • Use LOCAL models for 90%+ of tasks (FREE)');
    console.log('  • Keep API costs under $100-140/month');
    console.log('  • Alert at 70% of budget ($98)');
    console.log('  • Automatically fall back through 14 model options');

    console.log('\n📝 Next steps:');
    console.log('1. Start using CostOptimizedModelProvider in your code');
    console.log('2. Monitor costs: npm run cost-report');
    console.log('3. Adjust quotas as needed based on usage patterns');

    if (ollamaStatus.missing.length > 0) {
      console.log('\n⚠️  Some models are missing. Install them for better coverage:');
      ollamaStatus.missing.forEach((m) => {
        console.log(`   ollama pull ${m}`);
      });
    }
  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main as setupCostOptimization };
