# Minimal Annotations Guide

## What You Actually Need

Here's what decorators are actually required vs optional for Map/Record types:

### For Record Type

```typescript
@ConfigurationProperties('databases')  // ✅ Required - marks as config class
export class DatabasesRecordConfig {
  
  @ConfigProperty('connections')       // ✅ Required - maps to YAML path
  @Required()                          // ✅ Optional but useful - validates property exists
  @RecordType()                        // ✅ Required - prevents Map conversion
  connections: Record<string, DatabaseConnection>;
}
```

**That's it!** Only 3-4 decorators needed.

### For Map Type

```typescript
@ConfigurationProperties('databases')  // ✅ Required - marks as config class
export class DatabasesMapConfig {
  
  @ConfigProperty('connections')       // ✅ Required - maps to YAML path
  @Required()                          // ✅ Optional but useful - validates property exists
  connections: Map<string, DatabaseConnection>;
}
```

**Even simpler!** Only 2-3 decorators needed (no @RecordType needed for Map).

## What You DON'T Need

### ❌ Remove These (They Don't Work)

```typescript
@Validate()                           // ❌ Remove - only works for simple properties
@ValidateNested({ each: true })       // ❌ Remove - doesn't work for dynamic keys
@Type(() => DatabaseConnection)       // ❌ Remove - doesn't work for dynamic keys
```

### ❌ Remove These from Entry Classes Too

```typescript
// In DatabaseConnection class
export class DatabaseConnection {
  @IsString()      // ❌ Remove - doesn't validate in Map/Record
  host: string;
  
  @IsNumber()      // ❌ Remove - doesn't validate in Map/Record
  @Min(1)          // ❌ Remove - doesn't validate in Map/Record
  @Max(65535)      // ❌ Remove - doesn't validate in Map/Record
  port: number;
}
```

**Keep them only for documentation**, but understand they don't provide validation.

## Comparison: Before vs After

### ❌ Before (Misleading)

```typescript
import { ValidateNested, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class DatabaseConnection {
  @IsString()
  host: string;
  
  @IsNumber()
  @Min(1)
  @Max(65535)
  port: number;
}

@ConfigurationProperties('databases')
@Validate()                                    // Doesn't work
export class DatabasesConfig {
  @ConfigProperty('connections')
  @Required()
  @RecordType()
  @ValidateNested({ each: true })              // Doesn't work
  @Type(() => DatabaseConnection)              // Doesn't work
  connections: Record<string, DatabaseConnection>;
}
```

**Problems**: 
- Suggests validation works (it doesn't)
- Extra imports needed
- Confusing for users

### ✅ After (Honest)

```typescript
// No class-validator imports needed!

export class DatabaseConnection {
  host: string;
  port: number;
  username: string;
  password: string;
}

@ConfigurationProperties('databases')
export class DatabasesConfig {
  @ConfigProperty('connections')
  @Required()
  @RecordType()
  connections: Record<string, DatabaseConnection>;
}
```

**Benefits**:
- Clear and simple
- No false expectations
- Fewer imports
- Honest about limitations

## When to Use Each Decorator

### @ConfigurationProperties(prefix)
**Always required** - Marks the class as a configuration class and sets the YAML path prefix.

```typescript
@ConfigurationProperties('databases')  // Maps to 'databases' in YAML
class DatabasesConfig { }
```

### @ConfigProperty(path)
**Always required** - Maps a property to a specific path in the configuration.

```typescript
@ConfigProperty('connections')  // Maps to 'databases.connections' in YAML
connections: Record<string, DatabaseConnection>;
```

### @Required()
**Optional but recommended** - Validates that the property exists (not the contents).

```typescript
@Required()  // Throws error if 'connections' is missing
connections: Record<string, DatabaseConnection>;
```

**What it checks**: Property exists
**What it doesn't check**: Entry contents, required fields in entries

### @RecordType()
**Required for Record, not needed for Map** - Tells the system to keep as plain object.

```typescript
@RecordType()  // Keeps as plain object (don't convert to Map)
connections: Record<string, DatabaseConnection>;
```

Without this, the system might try to convert to Map.

### @DefaultValue(value)
**Optional** - Provides a default value if the property is missing.

```typescript
@DefaultValue({})  // Use empty object if missing
connections: Record<string, DatabaseConnection>;
```

## Complete Minimal Example

```typescript
import {
  ConfigurationProperties,
  ConfigProperty,
  Required,
  RecordType,
} from '@snow-tzu/type-config-nestjs';

// Simple interface - no decorators needed
export interface DatabaseConnection {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  schema: string;
  ssl: boolean;
}

// Minimal config class
@ConfigurationProperties('databases')
export class DatabasesConfig {
  @ConfigProperty('connections')
  @Required()
  @RecordType()
  connections: Record<string, DatabaseConnection>;
  
  @ConfigProperty('pool')
  @Required()
  pool: {
    min: number;
    max: number;
    idle: number;
  };
}

// Manual validation (required)
function validateDatabaseConnections(config: DatabasesConfig): void {
  for (const [name, conn] of Object.entries(config.connections)) {
    if (!conn.host) throw new Error(`${name}: missing host`);
    if (!conn.port) throw new Error(`${name}: missing port`);
    if (conn.port < 1 || conn.port > 65535) {
      throw new Error(`${name}: invalid port ${conn.port}`);
    }
    // ... more validation
  }
}
```

## Summary

**Minimal annotations for Record**:
1. `@ConfigurationProperties(prefix)` - Required
2. `@ConfigProperty(path)` - Required
3. `@Required()` - Optional but useful
4. `@RecordType()` - Required for Record

**Minimal annotations for Map**:
1. `@ConfigurationProperties(prefix)` - Required
2. `@ConfigProperty(path)` - Required
3. `@Required()` - Optional but useful

**Don't use**:
- `@Validate()` - Doesn't work for Map/Record
- `@ValidateNested()` - Doesn't work for dynamic keys
- `@Type()` - Doesn't work for dynamic keys
- class-validator decorators on entry classes - Don't validate

**Remember**: Manual validation is required for Map/Record entries!
