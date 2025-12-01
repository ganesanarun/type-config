import 'reflect-metadata';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function runAllBenchmarks() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   @snow-tzu/type-config Performance Benchmarks        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const timestamp = new Date().toISOString();
  const nodeVersion = process.version;
  const platform = `${process.platform} ${process.arch}`;

  console.log(`Date: ${timestamp}`);
  console.log(`Node.js: ${nodeVersion}`);
  console.log(`Platform: ${platform}\n`);

  let output = `# Benchmark Results\n\n`;
  output += `Generated: ${timestamp}  \n`;
  output += `Node.js: ${nodeVersion}  \n`;
  output += `Platform: ${platform}\n\n`;

  // Run configuration loading benchmarks
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('Running configuration loading benchmarks...\n');
  const { runBenchmarks: runLoadingBenchmarks } = await import('./config-loading.bench');
  const loadingResults = await runLoadingBenchmarks();
  output += loadingResults;

  console.log('\n═══════════════════════════════════════════════════════\n');
  console.log('Note: Run individual benchmarks for detailed results:\n');
  console.log('  yarn benchmark:loading  - Configuration loading benchmarks');
  console.log('  yarn benchmark:memory   - Memory usage benchmarks\n');

  // Save results
  const resultsPath = join(__dirname, '..', 'BENCHMARK_RESULTS.md');
  writeFileSync(resultsPath, output);
  console.log(`\n✅ Results saved to: ${resultsPath}\n`);
}

if (require.main === module) {
  runAllBenchmarks()
    .then(() => {
      console.log('All benchmarks completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Benchmark failed:', error);
      process.exit(1);
    });
}
