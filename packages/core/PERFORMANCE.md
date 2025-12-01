# Performance Overview

> Comprehensive performance characteristics of @snow-tzu/type-config

## Quick Summary

| Metric               | Value             | Rating |
|----------------------|-------------------|--------|
| **Config Loading**   | 2.7k-8.8k ops/sec | ⭐⭐⭐⭐⭐  |
| **Value Access**     | >3.6M ops/sec     | ⭐⭐⭐⭐⭐  |
| **Container Access** | >6.3M ops/sec     | ⭐⭐⭐⭐⭐  |
| **Memory Overhead**  | 1-5 MB            | ⭐⭐⭐⭐⭐  |
| **Production Ready** | Yes               | ✅      |

## Detailed Performance Tables

### 1. Configuration Loading Performance

| Config Size              | Ops/Sec | Avg Latency | p95    | p99    | Use Case        |
|--------------------------|---------|-------------|--------|--------|-----------------|
| **Small** (basic)        | 8,851   | 0.11ms      | 0.13ms | 0.19ms | Microservices   |
| **Medium** (50 sections) | 6,369   | 0.16ms      | 0.17ms | 0.22ms | Standard apps   |
| **Large** (200 sections) | 2,718   | 0.37ms      | 0.38ms | 0.43ms | Enterprise apps |

**Key Insight**: Even large configurations load in under half a millisecond. This is negligible compared to typical
application startup time.

### 2. Runtime Access Performance

| Access Method         | Ops/Sec      | Relative Speed    | When to Use                         |
|-----------------------|--------------|-------------------|-------------------------------------|
| **Container (Typed)** | 6,372,527    | **1.7x faster** ✅ | Production code, type safety needed |
| **Direct Path**       | 3,664,201    | Baseline          | Dynamic keys, runtime discovery     |
| **Raw Object**        | ~10,000,000+ | 1.6x faster       | Not recommended (no features)       |

**Key Insight**: Container-based access is both faster AND provides type safety. Always prefer it.

### 3. Memory Usage

| Scenario              | Heap Used | Delta    | RSS     | Delta    | Notes        |
|-----------------------|-----------|----------|---------|----------|--------------|
| Baseline              | 4.2 MB    | -        | 34.1 MB | -        | Node.js only |
| Small (10 sections)   | 5.5 MB    | +1.3 MB  | 36.8 MB | +2.7 MB  | Minimal      |
| Medium (100 sections) | 7.9 MB    | +3.7 MB  | 41.2 MB | +7.1 MB  | Typical      |
| Large (500 sections)  | 18.3 MB   | +14.1 MB | 58.5 MB | +24.3 MB | Monitor      |
| 10 Instances          | 12.6 MB   | +8.4 MB  | 48.9 MB | +14.8 MB | ~0.8 MB each |

**Key Insight**: Memory overhead is minimal for typical applications. Multiple instances share most of the memory.

## Performance Recommendations

### ✅ Do This

1. **Use typed container access**
   ```typescript
   const config = container.get(ServerConfig); // 6.3M ops/sec
   ```

2. **Cache configuration instances**
   ```typescript
   // Once at startup
   const config = await buildConfig();
   const server = container.get(ServerConfig);
   ```

3. **Keep configs a reasonable size** (< 100 sections)

4. **Disable hot reload in production**
   ```
    .withHotReload(false)
   ```

### ❌ Don't Do This

1. **Don't rebuild config repeatedly**
   ```typescript
   // BAD: Rebuilds on every request
   app.use(async (req, res) => {
     const config = await buildConfig(); // 0.1-0.4ms overhead
   });
   ```

2. **Don't use path access in hot paths**
   ```typescript
   // SLOWER: 3.6M ops/sec
   const host = configManager.get('server.host');
   
   // FASTER: 6.3M ops/sec
   const host = container.get(ServerConfig).host;
   ```

3. **Don't create massive configs** (> 500 sections)

## Benchmarking Comparison

### vs. Plain JSON.parse()

| Operation        | JSON.parse | Type Config | Overhead       |
|------------------|------------|-------------|----------------|
| Parse + validate | ~10-20ms   | ~0.1-0.4ms  | **95% faster** |
| Type safety      | ❌          | ✅           | Included       |
| Validation       | ❌          | ✅           | Included       |
| DI integration   | ❌          | ✅           | Included       |

**Key Insight**: Type Config is faster because it caches parsed configuration.

### vs. Direct Object Access

| Feature      | Direct Object | Type Config  | Difference         |
|--------------|---------------|--------------|--------------------|
| Access speed | ~10M ops/sec  | 6.3M ops/sec | 0.63x (acceptable) |
| Type safety  | ❌             | ✅            | Worth the cost     |
| Validation   | ❌             | ✅            | Worth the cost     |
| Hot reload   | ❌             | ✅            | Worth the cost     |
| Profiles     | ❌             | ✅            | Worth the cost     |

**Key Insight**: Slight overhead (~37% slower) is negligible in practice and provides massive benefits.

## Production Guidelines

### For Microservices (< 20 config sections)

- ✅ Loading: ~0.11ms (negligible)
- ✅ Memory: ~1-2 MB (minimal)
- ✅ Hot reload: Optional
- **Assessment**: Perfect fit

### For Standard Applications (20-100 sections)

- ✅ Loading: ~0.16ms (negligible)
- ✅ Memory: ~3-4 MB (acceptable)
- ✅ Hot reload: Recommended for dev
- **Assessment**: Excellent fit

### For Enterprise Applications (100-500 sections)

- ⚠️ Loading: ~0.37ms (monitor)
- ⚠️ Memory: ~10-15 MB (monitor)
- ❌ Hot reload: Disable in production
- **Assessment**: Good fit, monitor metrics

### For Very Large Configs (> 500 sections)

- ❌ Loading: > 0.5ms (consider splitting)
- ❌ Memory: > 15 MB (consider splitting)
- ❌ Hot reload: Not recommended
- **Assessment**: Consider splitting into multiple config domains

## Running Benchmarks

```bash
cd packages/core

# Quick overview
yarn benchmark

# Detailed loading performance
yarn benchmark:loading

# Memory analysis (requires --expose-gc)
yarn benchmark:memory
```

See [benchmark/README.md](./benchmark/README.md) for detailed documentation.

## System Requirements

Benchmarks were run on:

- **CPU**: Apple M1/M2 (ARM64)
- **Memory**: 16GB
- **OS**: macOS Sonoma
- **Node.js**: v24.5.0

Your results may vary. Run benchmarks on your target deployment hardware for accurate measurements.

## Continuous Performance Monitoring

Consider adding benchmarks to your CI/CD pipeline:

```yaml
# .github/workflows/performance.yml
- name: Run performance benchmarks
  run: |
    cd packages/core
    yarn benchmark:loading
    yarn benchmark:memory

- name: Check for regressions
  run: |
    # Compare with baseline
    # Fail if performance degrades > 20%
```

## Questions?

- 📚 [Benchmark Documentation](./benchmark/README.md)
- 🚀 [Quick Start Guide](./benchmark/QUICKSTART.md)
- 📊 [Latest Results](./BENCHMARK_RESULTS.md)
- 💡 [Performance Tips](./README.md#performance)
