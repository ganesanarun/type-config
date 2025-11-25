# Benchmark Quick Start

## Run All Benchmarks

```bash
cd packages/core
yarn benchmark
```

This will:
1. Compile TypeScript to dist/
2. Run the main benchmark suite
3. Save results to `BENCHMARK_RESULTS.md`

## Run Individual Benchmarks

### Configuration Loading Performance
```bash
yarn benchmark:loading
```

Measures:
- Small/medium/large config loading times
- Config value retrieval by path
- Typed config access from DI container

### Memory Usage Analysis
```bash
yarn benchmark:memory
```

Measures:
- Heap and RSS memory usage
- Memory scaling with config size
- Multiple instance overhead

**Note:** Run with `--expose-gc` for accurate results:
```bash
node --expose-gc dist/benchmark/memory.bench.js
```

## Understanding Results

### Configuration Loading
```
Load small JSON config
- Operations/sec: 8,851.39    ← Higher is better
- Average time: 0.113ms        ← Lower is better
- p50: 0.109ms                 ← Median latency
- p95: 0.127ms                 ← 95th percentile
- p99: 0.189ms                 ← 99th percentile
```

### Memory Usage
```
Small config (10 sections)
- Heap Used: 5.45 MB (Δ +1.22 MB)   ← Memory delta
- RSS: 36.78 MB (Δ +2.66 MB)        ← Process memory
```

## Adding New Benchmarks

1. Create a new `.bench.ts` file in `benchmark/`
2. Import the benchmark utilities:
   ```typescript
   import { benchmark, formatResults } from './utils';
   ```

3. Use the benchmark function:
   ```typescript
   const result = await benchmark(
     'My benchmark name',
     async () => {
       // Code to benchmark
     },
     { 
       warmupIterations: 100,
       iterations: 1000,
       minTime: 1000 // minimum 1 second
     }
   );
   ```

4. Add a script to `package.json`:
   ```json
   {
     "scripts": {
       "benchmark:mybench": "yarn build && node dist/benchmark/mybench.bench.js"
     }
   }
   ```

## Tips for Accurate Benchmarking

1. **Close other applications** to reduce system load
2. **Run multiple times** and take the median result
3. **Use warmup iterations** to let JIT optimize code
4. **Disable hot reload** when benchmarking loading times
5. **Run with `--expose-gc`** for memory benchmarks
6. **Use consistent hardware** when comparing results

## Comparing Performance

Before making changes:
```bash
yarn benchmark:loading > before.txt
```

After making changes:
```bash
yarn benchmark:loading > after.txt
diff before.txt after.txt
```

## CI/CD Integration

Add to your CI pipeline:
```yaml
- name: Run benchmarks
  run: |
    cd packages/core
    yarn benchmark:loading
    yarn benchmark:memory
```

## Troubleshooting

### "Cannot find module" error
Make sure to build first:
```bash
yarn build
```

### Memory benchmark shows no GC
Run with the `--expose-gc` flag:
```bash
node --expose-gc dist/benchmark/memory.bench.js
```

### Results seem inconsistent
- Close background applications
- Run on a stable system (not under heavy load)
- Increase iterations for more stable averages
- Use `minTime` to ensure enough samples
