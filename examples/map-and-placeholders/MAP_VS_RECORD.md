# Map vs Record: Choosing the Right Approach

This example demonstrates two approaches for map-based configuration: `Map<string, T>` and `Record<string, T>`. Each has trade-offs.

## Comparison

| Feature | Map<string, T> | Record<string, T> |
|---------|----------------|-------------------|
| **Validation** | ❌ Doesn't work with class-validator | ⚠️ API exists but not fully implemented yet |
| **Type Safety** | ✅ True Map type | ✅ Object with string keys |
| **Map Methods** | ✅ .get(), .set(), .has(), .delete() | ❌ Must use bracket notation |
| **Iteration** | ✅ for...of with .entries() | ✅ Object.keys(), Object.entries() |
| **JSON Serialization** | ❌ Requires conversion | ✅ Works directly |
| **Spec Compliance** | ✅ Matches spec requirements | ⚠️ Alternative approach |

## Map Approach (Current Example)

### Configuration Class

```typescript
@ConfigurationProperties('databases')
export class DatabasesConfig {
  @ConfigProperty('connections')
  @Required()
  connections: Map<string, DatabaseConnection>;
}
```

### Pros
- True Map type with all Map methods
- Cleaner API: `config.connections.get('serhafen-us')`
- Better for dynamic keys
- Matches the spec requirements

### Cons
- **Validation doesn't work** - class-validator can't validate Map entries
- Must set `validateOnBind: false`
- Need manual validation for map entries
- More complex to serialize to JSON

### Usage

```typescript
const databasesConfig = configManager.bind(DatabasesConfig);

// Access with Map methods
const usDb = databasesConfig.connections.get('serhafen-us');

// Iterate
for (const [name, conn] of databasesConfig.connections) {
  console.log(`${name}: ${conn.host}`);
}

// Manual validation required
for (const [name, conn] of databasesConfig.connections) {
  if (!conn.host || !conn.port) {
    throw new Error(`Invalid connection: ${name}`);
  }
}
```

## Record Approach (Alternative)

### Configuration Class

```typescript
@ConfigurationProperties('databases')
@Validate()
export class DatabasesRecordConfig {
  @ConfigProperty('connections')
  @Required()
  @RecordType()  // Important: Prevents conversion to Map
  @ValidateNested({ each: true })
  @Type(() => DatabaseConnectionValidated)
  connections: Record<string, DatabaseConnectionValidated>;
}
```

**Important**: The `@RecordType()` decorator is required to tell the system to keep this as a plain object and not convert it to a Map.

### Pros
- Cleaner validation API with `@Validate()` decorator
- Would validate each entry automatically (when implemented)
- Would show which entry failed (when implemented)
- Simpler JSON serialization
- No need to convert Map for HTTP responses

### Cons
- **Validation not yet fully implemented** - @ValidateNested() doesn't work yet
- Not a true Map (no Map methods)
- Must use bracket notation: `connections['serhafen-us']`
- Less type-safe for dynamic keys
- Doesn't match spec requirements exactly

### Usage

```typescript
const databasesConfig = configManager.bind(DatabasesRecordConfig);

// Access with bracket notation
const usDb = databasesConfig.connections['serhafen-us'];

// Iterate
for (const [name, conn] of Object.entries(databasesConfig.connections)) {
  console.log(`${name}: ${conn.host}`);
}

// Validation happens automatically - no manual checks needed!
```

## Testing the Record Approach

**Note**: Record validation is not yet fully implemented in the core library. The example shows the intended API, but validation won't work until the implementation is completed.

When implemented, you would test it like this:

1. **Update `app.module.ts`**:
```typescript
TypeConfigModule.forRoot({
  configDir: './config',
  profile: process.env.NODE_ENV || 'development',
  enableHotReload: false,
  validateOnBind: true,  // Enable validation
})
```

2. **Use the Record config class**:
```typescript
import { DatabasesRecordConfig } from './config/database-record.config';

const databasesConfig = configManager.bind(DatabasesRecordConfig);
```

3. **Test validation** by removing a required field - this would throw an error when implemented:
```yaml
# config/application.yml
databases:
  connections:
    serhafen-us:
      host: localhost
      # Remove port to test validation
      username: postgres
      password: dev_password
```

Expected error (when implemented):
```
Validation failed for DatabasesRecordConfig:
- connections.serhafen-us.port must be a number
```

## Recommendation

### Use Map (Current Recommendation):
- ✅ Fully implemented and working
- ✅ True Map semantics (get, set, has, delete)
- ✅ Matches the spec requirements
- ✅ Dynamic key operations work well
- ⚠️ Requires manual validation
- ⚠️ Needs `Object.fromEntries()` for JSON serialization

### Use Record (Future):
- ⚠️ Validation not yet fully implemented
- ✅ Would have automatic validation (when implemented)
- ✅ Simpler JSON serialization
- ❌ Not a true Map (no Map methods)
- ❌ Doesn't match spec exactly

**For now, use Map with manual validation** until Record validation is fully implemented in the core library.

## Future Enhancement

Ideally, the core library would support validation for both Map and Record types. This would require:

1. Detecting Map vs Record types
2. For Map: Converting to Record, validating, then converting back
3. For Record: Using existing class-validator support

This would give users the best of both worlds: Map semantics with automatic validation.

## Example Files

- **Map approach**: `src/config/database.config.ts` (current example)
- **Record approach**: `src/config/database-record.config.ts` (alternative)

Try both and choose what works best for your use case!
