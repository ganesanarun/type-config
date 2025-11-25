import 'reflect-metadata';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { ConfigurationBuilder, ConfigurationProperties, ConfigProperty } from '../src';

const TEMP_DIR = join(__dirname, '.tmp-memory');

@ConfigurationProperties('test')
class TestConfig {
  @ConfigProperty()
  value!: string;
}

function getMemoryUsage() {
  global.gc && global.gc();
  const usage = process.memoryUsage();
  return {
    heapUsed: usage.heapUsed / 1024 / 1024, // MB
    heapTotal: usage.heapTotal / 1024 / 1024,
    external: usage.external / 1024 / 1024,
    rss: usage.rss / 1024 / 1024,
  };
}

async function measureMemory(name: string, fn: () => Promise<void>) {
  const before = getMemoryUsage();
  await fn();
  const after = getMemoryUsage();

  const diff = {
    heapUsed: after.heapUsed - before.heapUsed,
    heapTotal: after.heapTotal - before.heapTotal,
    external: after.external - before.external,
    rss: after.rss - before.rss,
  };

  return { name, before, after, diff };
}

function setupConfig(numSections: number) {
  rmSync(TEMP_DIR, { recursive: true, force: true });
  mkdirSync(TEMP_DIR, { recursive: true });

  const config: any = {};
  for (let i = 0; i < numSections; i++) {
    config[`section${i}`] = {
      value1: `value${i}`,
      value2: i,
      nested: {
        prop1: `nested${i}`,
        prop2: i * 2,
        deep: {
          prop1: `deep${i}`,
          prop2: i * 3,
          array: Array.from({ length: 10 }, (_, j) => ({
            id: j,
            name: `item${j}`,
          })),
        },
      },
    };
  }

  writeFileSync(
    join(TEMP_DIR, 'application.json'),
    JSON.stringify(config, null, 2)
  );
}

async function runMemoryBenchmarks() {
  console.log('Starting memory usage benchmarks...\n');

  if (!global.gc) {
    console.warn('⚠️  Run with --expose-gc flag for accurate memory measurements');
    console.warn('   Example: node --expose-gc dist/benchmark/memory.bench.js\n');
  }

  const results = [];

  // Baseline memory usage
  const baseline = await measureMemory('Baseline (no config)', async () => {
    // Do nothing
  });
  results.push(baseline);

  // Small config
  setupConfig(10);
  const small = await measureMemory('Small config (10 sections)', async () => {
    const { configManager } = await new ConfigurationBuilder()
      .withConfigDir(TEMP_DIR)
      .build();
    configManager.getAll();
  });
  results.push(small);

  // Medium config
  setupConfig(100);
  const medium = await measureMemory('Medium config (100 sections)', async () => {
    const { configManager } = await new ConfigurationBuilder()
      .withConfigDir(TEMP_DIR)
      .build();
    configManager.getAll();
  });
  results.push(medium);

  // Large config
  setupConfig(500);
  const large = await measureMemory('Large config (500 sections)', async () => {
    const { configManager } = await new ConfigurationBuilder()
      .withConfigDir(TEMP_DIR)
      .build();
    configManager.getAll();
  });
  results.push(large);

  // Multiple instances
  setupConfig(50);
  const multiple = await measureMemory('10 config instances', async () => {
    const instances = [];
    for (let i = 0; i < 10; i++) {
      const { configManager } = await new ConfigurationBuilder()
        .withConfigDir(TEMP_DIR)
        .build();
      instances.push(configManager);
    }
    // Keep references alive
    instances.forEach((cm) => cm.getAll());
  });
  results.push(multiple);

  // Cleanup
  rmSync(TEMP_DIR, { recursive: true, force: true });

  // Display results
  console.log('## Memory Usage Results\n');
  for (const result of results) {
    console.log(`### ${result.name}`);
    console.log(`- Heap Used: ${result.after.heapUsed.toFixed(2)} MB (Δ ${result.diff.heapUsed >= 0 ? '+' : ''}${result.diff.heapUsed.toFixed(2)} MB)`);
    console.log(`- Heap Total: ${result.after.heapTotal.toFixed(2)} MB (Δ ${result.diff.heapTotal >= 0 ? '+' : ''}${result.diff.heapTotal.toFixed(2)} MB)`);
    console.log(`- External: ${result.after.external.toFixed(2)} MB (Δ ${result.diff.external >= 0 ? '+' : ''}${result.diff.external.toFixed(2)} MB)`);
    console.log(`- RSS: ${result.after.rss.toFixed(2)} MB (Δ ${result.diff.rss >= 0 ? '+' : ''}${result.diff.rss.toFixed(2)} MB)`);
    console.log();
  }

  return results;
}

if (require.main === module) {
  runMemoryBenchmarks()
    .then(() => {
      console.log('Memory benchmarks completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Benchmark failed:', error);
      process.exit(1);
    });
}
