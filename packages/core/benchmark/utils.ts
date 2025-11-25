export interface BenchmarkResult {
  name: string;
  opsPerSecond: number;
  avgTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  iterations: number;
  totalTimeMs: number;
}

export interface BenchmarkOptions {
  warmupIterations?: number;
  iterations?: number;
  minTime?: number; // minimum time in ms to run
}

export async function benchmark(
  name: string,
  fn: () => void | Promise<void>,
  options: BenchmarkOptions = {}
): Promise<BenchmarkResult> {
  const {
    warmupIterations = 100,
    iterations = 1000,
    minTime = 1000,
  } = options;

  // Warmup phase
  for (let i = 0; i < warmupIterations; i++) {
    await fn();
  }

  // Measurement phase
  const times: number[] = [];
  const startTime = performance.now();
  let iterationCount = 0;

  while (iterationCount < iterations || (performance.now() - startTime) < minTime) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
    iterationCount++;
  }

  const totalTime = performance.now() - startTime;
  times.sort((a, b) => a - b);

  const sum = times.reduce((acc, t) => acc + t, 0);
  const avgTime = sum / times.length;
  const opsPerSecond = (times.length / totalTime) * 1000;

  return {
    name,
    opsPerSecond,
    avgTimeMs: avgTime,
    minTimeMs: times[0],
    maxTimeMs: times[times.length - 1],
    p50Ms: percentile(times, 0.5),
    p95Ms: percentile(times, 0.95),
    p99Ms: percentile(times, 0.99),
    iterations: times.length,
    totalTimeMs: totalTime,
  };
}

function percentile(sorted: number[], p: number): number {
  const index = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, index)];
}

export function formatResults(results: BenchmarkResult[]): string {
  let output = '\n## Benchmark Results\n\n';
  
  for (const result of results) {
    output += `### ${result.name}\n`;
    output += `- Operations/sec: ${result.opsPerSecond.toFixed(2)}\n`;
    output += `- Average time: ${result.avgTimeMs.toFixed(3)}ms\n`;
    output += `- Min time: ${result.minTimeMs.toFixed(3)}ms\n`;
    output += `- Max time: ${result.maxTimeMs.toFixed(3)}ms\n`;
    output += `- p50: ${result.p50Ms.toFixed(3)}ms\n`;
    output += `- p95: ${result.p95Ms.toFixed(3)}ms\n`;
    output += `- p99: ${result.p99Ms.toFixed(3)}ms\n`;
    output += `- Total iterations: ${result.iterations}\n`;
    output += `- Total time: ${result.totalTimeMs.toFixed(2)}ms\n\n`;
  }
  
  return output;
}

export function formatComparison(baseline: BenchmarkResult, current: BenchmarkResult): string {
  const speedup = current.opsPerSecond / baseline.opsPerSecond;
  const speedupPercent = ((speedup - 1) * 100).toFixed(2);
  const sign = speedup >= 1 ? '+' : '';
  
  return `${current.name} vs ${baseline.name}: ${sign}${speedupPercent}% (${speedup.toFixed(2)}x)`;
}
