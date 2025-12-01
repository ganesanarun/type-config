# Benchmarks

Performance benchmarks for @snow-tzu/type-config.

## Running Benchmarks

```bash
# Run all benchmarks
yarn benchmark

# Run specific benchmarks
yarn benchmark:loading   # Configuration loading performance
yarn benchmark:memory    # Memory usage analysis
```

## Benchmark Suites

### Configuration Loading (`config-loading.bench.ts`)

Measures performance of:

- Loading small, medium, and large configuration files
- Configuration value retrieval by path
- Typed configuration access via DI container

**Metrics:**

- Operations per second
- Average, min, max latency
- p50, p95, p99 percentiles

### Memory Usage (`memory.bench.ts`)

Measures memory consumption for:

- Different configuration sizes (10, 100, 500 sections)
- Multiple configuration instances
- Heap and RSS memory usage

**Note:** For accurate memory measurements, run with `--expose-gc`:

```bash
node --expose-gc dist/benchmark/memory.bench.js
```

## Benchmark Infrastructure

The benchmarks use a custom lightweight framework (`utils.ts`) that provides:

- Warmup iterations to eliminate JIT compilation effects
- Statistical analysis (percentiles, min/max)
- Consistent result formatting
- Comparison utilities

## Understanding Results

### Operations per Second

Higher is better. Indicates how many operations can be performed per second.

### Latency Percentiles

- **p50 (median)**: 50% of operations complete faster than this
- **p95**: 95% of operations complete faster than this
- **p99**: 99% of operations complete faster than this

Lower is better for all latency metrics.

### Memory Usage

- **Heap Used**: Memory actively used by JavaScript objects
- **RSS**: Total resident set size (actual RAM usage)

## Baseline Results

Expected performance characteristics on modern hardware:

### Configuration Loading Performance

| Scenario                    | Ops/Sec | Avg Latency | p95 Latency | p99 Latency |
|-----------------------------|---------|-------------|-------------|-------------|
| Small config (basic)        | ~6.2k   | 0.16ms      | 0.26ms      | 0.53ms      |
| Medium config (50 sections) | ~3.8k   | 0.26ms      | 0.41ms      | 0.87ms      |
| Large config (200 sections) | ~1.6k   | 0.63ms      | 0.76ms      | 1.07ms      |
| Config value retrieval      | >3.2M   | <0.001ms    | <0.001ms    | <0.001ms    |
| Typed container access      | >5.9M   | <0.001ms    | <0.001ms    | <0.001ms    |

### Memory Usage

| Config Size           | Heap Used | RSS Memory | Notes                |
|-----------------------|-----------|------------|----------------------|
| Baseline (no config)  | ~4 MB     | ~34 MB     | Node.js baseline     |
| Small (10 sections)   | ~5.5 MB   | ~37 MB     | +1.5 MB overhead     |
| Medium (100 sections) | ~8 MB     | ~41 MB     | +4 MB overhead       |
| Large (500 sections)  | ~18 MB    | ~58 MB     | +14 MB overhead      |
| 10 instances          | ~13 MB    | ~49 MB     | ~0.9 MB per instance |

**Note:** Results vary based on hardware and system load. Run benchmarks on your target hardware for accurate
measurements.

## Performance Comparison

### Access Method Comparison

| Method                   | Ops/Sec | Use Case                            |
|--------------------------|---------|-------------------------------------|
| Container access (typed) | 5.9M    | ✅ **Recommended** - Production code |
| Direct path access       | 3.2M    | ⚠️ Dynamic/runtime access only      |
| Raw object access        | ~10M+   | Baseline (direct object property)   |

### Configuration Size Impact

| Config Size                | Load Time | Memory Overhead | Recommendation       |
|----------------------------|-----------|-----------------|----------------------|
| Small (<20 sections)       | ~0.11ms   | ~1-2 MB         | ✅ Optimal            |
| Medium (20-100 sections)   | ~0.16ms   | ~3-4 MB         | ✅ Good               |
| Large (100-500 sections)   | ~0.37ms   | ~10-15 MB       | ⚠️ Monitor           |
| Very Large (500+ sections) | >0.5ms    | >15 MB          | ❌ Consider splitting |

## Contributing

When adding new features, consider:

1. Adding relevant benchmarks to validate performance
2. Running benchmarks before and after changes
3. Documenting any significant performance impacts
