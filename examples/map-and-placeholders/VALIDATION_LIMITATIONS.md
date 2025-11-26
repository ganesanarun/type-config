# Map/Record Validation Limitations

## Summary

**Automatic validation of Map/Record entries is NOT supported in Type Config.**

This is a fundamental limitation of class-validator, not a bug or missing feature. This document explains why and provides solutions.

## Why Validation Doesn't Work

### The Problem

class-validator requires **known properties at compile time**. When you write:

```typescript
class ServerConfig {
  @IsString()
  host: string;  // ✅ Known property - validation works
}
```

class-validator knows to check the `host` property.

But with Map/Record:

```typescript
class DatabasesConfig {
  @ValidateNested({ each: true })
  connections: Map<string, DatabaseConnection>;  // ❌ Unknown keys - validation fails
}
```

class-validator doesn't know what keys will exist at runtime (`serhafen-us`, `serhafen-ag`, etc.), so it can't validate them.

### What Actually Happens

When you try to use `validateOnBind: true` with Map/Record:

```typescript
const manager = new ConfigManager({ validateOnBind: true });
const config = manager.bind(DatabasesConfig);
// ❌ Throws: "undefined: an unknown value was passed to the validate function"
```

This error means class-validator encountered something it doesn't understand (the Map/Record with dynamic keys).

## What Works vs What Doesn't

### ✅ What Works

1. **Binding**: YAML/JSON → Map/Record conversion works perfectly
2. **Placeholder resolution**: `${VAR:fallback}` works in map values
3. **@Required()**: Validates that the Map/Record property exists
4. **Type conversion**: Objects are converted to Map correctly
5. **Access patterns**: `.get()` for Map, bracket notation for Record

### ❌ What Doesn't Work

1. **Entry validation**: `@ValidateNested({ each: true })` doesn't work
2. **Field validation**: `@IsString()`, `@IsNumber()` on entry fields
3. **Range validation**: `@Min()`, `@Max()` on entry fields
4. **Required fields**: Missing fields in entries won't cause errors
5. **Type checking**: Invalid types in entries won't be caught

## Solutions

### Solution 1: Manual Validation (Recommended)

Validate entries manually in your application code:

```typescript
const config = manager.bind(DatabasesConfig);

// Validate each entry
for (const [name, conn] of config.connections) {
  // Check required fields
  if (!conn.host) {
    throw new Error(`Database '${name}' missing host`);
  }
  
  // Check types
  if (typeof conn.port !== 'number') {
    throw new Error(`Database '${name}' port must be a number`);
  }
  
  // Check ranges
  if (conn.port < 1 || conn.port > 65535) {
    throw new Error(`Database '${name}' invalid port: ${conn.port}`);
  }
  
  // Check patterns
  if (!conn.host.match(/^[a-z0-9.-]+$/)) {
    throw new Error(`Database '${name}' invalid host format`);
  }
}
```

### Solution 2: Helper Function

Create a reusable validation function:

```typescript
function validateDatabaseConnection(name: string, conn: DatabaseConnection): void {
  const errors: string[] = [];
  
  if (!conn.host) errors.push('missing host');
  if (!conn.port) errors.push('missing port');
  if (conn.port < 1 || conn.port > 65535) errors.push('invalid port range');
  if (!conn.username) errors.push('missing username');
  if (!conn.password) errors.push('missing password');
  
  if (errors.length > 0) {
    throw new Error(`Database '${name}' validation failed: ${errors.join(', ')}`);
  }
}

// Use it
for (const [name, conn] of config.connections) {
  validateDatabaseConnection(name, conn);
}
```

### Solution 3: Use Individual Properties

If validation is critical and you have a fixed set of connections:

```typescript
@ConfigurationProperties('databases')
class DatabasesConfig {
  @ValidateNested()
  @Type(() => DatabaseConnection)
  @IsNotEmpty()
  primary: DatabaseConnection;  // ✅ Validates automatically
  
  @ValidateNested()
  @Type(() => DatabaseConnection)
  @IsNotEmpty()
  replica: DatabaseConnection;   // ✅ Validates automatically
  
  @ValidateNested()
  @Type(() => DatabaseConnection)
  @IsOptional()
  analytics?: DatabaseConnection;  // ✅ Validates if present
}
```

This works because the properties are known at compile time.

### Solution 4: Use a Different Validation Library

Consider using a validation library that supports dynamic keys:

- **Zod**: Supports `z.record()` for dynamic keys
- **Yup**: Supports dynamic object validation
- **Joi**: Supports pattern-based validation

Example with Zod:

```typescript
import { z } from 'zod';

const DatabaseConnectionSchema = z.object({
  host: z.string().min(1),
  port: z.number().min(1).max(65535),
  username: z.string().min(1),
  password: z.string().min(1),
  database: z.string().min(1),
  schema: z.string().min(1),
  ssl: z.boolean(),
});

const DatabasesConfigSchema = z.object({
  connections: z.record(DatabaseConnectionSchema),  // ✅ Validates dynamic keys!
});

// Validate
const config = manager.bind(DatabasesConfig);
DatabasesConfigSchema.parse(config);  // Throws if invalid
```

## Best Practices

1. **Always use `validateOnBind: false`** with Map/Record types
2. **Implement manual validation** in your bootstrap/startup code
3. **Fail fast**: Validate at startup, not at runtime
4. **Provide clear error messages**: Include the entry name in errors
5. **Document validation requirements**: Make it clear what's expected
6. **Consider alternatives**: If validation is critical, use individual properties

## Example: Complete Validation Pattern

```typescript
// 1. Configuration class (no validation decorators on Map/Record)
@ConfigurationProperties('databases')
class DatabasesConfig {
  @ConfigProperty('connections')
  @Required()  // ✅ Only validates that property exists
  connections: Map<string, DatabaseConnection>;
}

// 2. Validation function
function validateDatabaseConnections(config: DatabasesConfig): void {
  if (config.connections.size === 0) {
    throw new Error('At least one database connection is required');
  }
  
  for (const [name, conn] of config.connections) {
    // Validate each field
    if (!conn.host) throw new Error(`Database '${name}' missing host`);
    if (!conn.port) throw new Error(`Database '${name}' missing port`);
    if (conn.port < 1 || conn.port > 65535) {
      throw new Error(`Database '${name}' invalid port: ${conn.port}`);
    }
    if (!conn.username) throw new Error(`Database '${name}' missing username`);
    if (!conn.password) throw new Error(`Database '${name}' missing password`);
    if (!conn.database) throw new Error(`Database '${name}' missing database`);
    if (!conn.schema) throw new Error(`Database '${name}' missing schema`);
    if (typeof conn.ssl !== 'boolean') {
      throw new Error(`Database '${name}' ssl must be boolean`);
    }
  }
}

// 3. Bootstrap with validation
async function bootstrap() {
  const manager = new ConfigManager({
    validateOnBind: false,  // ✅ Disable automatic validation
  });
  
  await manager.initialize();
  
  const config = manager.bind(DatabasesConfig);
  
  // ✅ Manual validation
  validateDatabaseConnections(config);
  
  // Now safe to use
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
```

## Why We Removed validateMapEntries()

The `MapBinder.validateMapEntries()` method was removed because:

1. **It didn't work properly**: It threw confusing errors
2. **It was misleading**: Suggested validation was supported when it wasn't
3. **It was inconsistent**: Worked differently than class-validator
4. **Manual validation is clearer**: Explicit is better than implicit

## Conclusion

Map/Record types are excellent for **structure and binding**, but require **manual validation**.

This is not a limitation of Type Config - it's a fundamental limitation of class-validator's design. The library now clearly documents this limitation and provides patterns for manual validation.

**Key Takeaway**: Use `validateOnBind: false` with Map/Record and implement manual validation in your application code.
