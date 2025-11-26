# Map and Placeholders Example

This example demonstrates two powerful features of Type Config:

1. **Map-based Configuration Binding**: Bind configuration to `Map<string, T>` properties for managing collections of similar entities
2. **Advanced Environment Variable Resolution**: Use `${VAR:fallback}` syntax with profile-aware precedence

## ⚠️ Important Limitations

**Automatic validation of Map/Record entries is NOT supported.**

This is a fundamental limitation of class-validator, which requires known properties at compile time. Map and Record types have dynamic keys, so:

- ✅ **What works**: Binding YAML/JSON to Map/Record, placeholder resolution, `@Required()` (checks if property exists)
- ❌ **What doesn't work**: Automatic validation of entry contents (port ranges, required fields within entries, etc.)
- ✅ **Solution**: Manual validation (see `main.ts` for example)

If strict validation is critical, consider using individual properties instead of Map/Record.

## Features Demonstrated

### 1. Map-Based Configuration

The example shows how to use `Map<string, T>` for:
- **Multiple database connections** (`databases.connections`)
- **Service endpoints** (`services.endpoints`)

This eliminates the need to define individual properties for each connection or service.

### 2. Placeholder Resolution

The example demonstrates:
- **Basic placeholders**: `${SERVER_HOST:localhost}`
- **Placeholders without fallbacks**: `${PROD_DB_US_PASSWORD}` (required in production)
- **Profile-specific overrides**: Different placeholders in `application-production.yml`
- **Multiple placeholders in one value**: Supported throughout
- **Nested structures**: Placeholders work in map values

### 3. Precedence Rules

The example shows the configuration resolution order:
1. **Underscore-based ENV variables** (priority 200, e.g., `DATABASES_POOL_MIN`)
2. **Profile-specific file values** (priority 150, can contain placeholders or literals)
3. **Base file values** (priority 100, can contain placeholders or literals)
4. **Placeholder resolution** (happens after merging, resolves `${VAR:fallback}`)
5. **Default values from decorators** (lowest priority)

**Key Point**: Underscore-based ENV vars override file values, then placeholders in the merged result are resolved.

## Project Structure

```
examples/map-and-placeholders/
├── config/
│   ├── application.yml              # Base configuration
│   └── application-production.yml   # Production overrides
├── src/
│   ├── config/
│   │   ├── database.config.ts       # Map-based database config
│   │   ├── services.config.ts       # Map-based services config
│   │   ├── server.config.ts         # Server config with placeholders
│   │   └── features.config.ts       # Feature flags with placeholders
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   └── main.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Configuration Files

### application.yml (Base)

```yaml
databases:
  connections:
    serhafen-us:
      host: ${DB_US_HOST:localhost}
      username: ${DB_US_USERNAME:postgres}
      password: ${DB_US_PASSWORD:dev_password}
      # ... more properties
```

### application-production.yml (Profile Override)

```yaml
databases:
  connections:
    serhafen-us:
      host: ${PROD_DB_US_HOST:prod-db-us.example.com}
      username: ${PROD_DB_US_USERNAME:prod_user}
      password: ${PROD_DB_US_PASSWORD}  # No fallback - must be set!
```

## Running the Example

### Development Mode (Default Profile)

```bash
# Install dependencies
yarn install

# Run with default configuration
yarn dev

# Or with specific environment variables
DB_US_HOST=custom-host yarn dev
```

### Production Mode

```bash
# Set required environment variables
export PROD_DB_US_PASSWORD=secret123
export PROD_DB_AG_PASSWORD=secret456
export PROD_DB_ANALYTICS_PASSWORD=secret789

# Run in production mode
NODE_ENV=production yarn dev
```

### Using Underscore-Based ENV Resolution

Type Config also supports underscore-based environment variable resolution:

```bash
# These will override configuration values
export DATABASES_POOL_MIN=5
export DATABASES_POOL_MAX=20
export DATABASES_CONNECTIONS_SERHAFEN_US_HOST=override-host

yarn dev
```

**Note**: Underscore-based ENV variables have priority 200 and override file values. Placeholders are resolved after all sources are merged.

**Known Limitation**: Underscore-based ENV resolution doesn't work correctly with kebab-case keys in maps (e.g., `serhafen-us`). Use explicit placeholders instead for map entries with hyphens in their keys.

## API Endpoints

Once running, you can access:

- `GET /` - Welcome message
- `GET /config` - View all configuration (with masked passwords)
- `GET /database/:name` - Get specific database connection (e.g., `/database/serhafen-us`)
- `GET /service/:name` - Get specific service endpoint (e.g., `/service/auth-service`)

## Example Output

```
=== Map and Placeholders Example ===

🚀 Server: map-and-placeholders-app
📝 Profile: development
🌐 Host: localhost:3000

--- Database Connections (Map-based) ---
  📊 serhafen-us:
     Host: localhost:5432
     Database: serhafen_common (schema: us)
     Username: postgres
     SSL: false
  📊 serhafen-ag:
     Host: localhost:5432
     Database: serhafen_ag (schema: ag)
     Username: postgres
     SSL: false
  📊 analytics:
     Host: localhost:5432
     Database: analytics_db (schema: public)
     Username: analytics_user
     SSL: false

--- Connection Pool Settings ---
  Min: 2
  Max: 10
  Idle: 10000ms

--- Service Endpoints (Map-based) ---
  🔗 auth-service:
     URL: http://localhost:8001
     Timeout: 5000ms
     Retries: 3
  🔗 payment-service:
     URL: http://localhost:8002
     Timeout: 10000ms
     Retries: 5
  🔗 notification-service:
     URL: http://localhost:8003
     Timeout: 3000ms
     Retries: 2

--- Feature Flags (Placeholder-based) ---
  🎨 New UI: false
  🧪 Beta Features: false
  🔧 Maintenance Mode: false
```

## Key Concepts

### Map-Based Configuration

```typescript
@ConfigurationProperties('databases')
export class DatabasesConfig {
  @ConfigProperty('connections')
  connections: Map<string, DatabaseConnection>;
  
  getConnection(name: string): DatabaseConnection | undefined {
    return this.connections.get(name);
  }
}
```

The `connections` property is automatically bound as a `Map<string, DatabaseConnection>` from the YAML structure.

### Placeholder Syntax

- `${VAR}` - Use environment variable, undefined if not set
- `${VAR:fallback}` - Use environment variable, or fallback if not set
- `${VAR:}` - Use environment variable, or empty string if not set

### Profile-Specific Overrides

When using `NODE_ENV=production`:
1. Base `application.yml` is loaded
2. Profile-specific `application-production.yml` is loaded and merged
3. Profile-specific placeholders override base placeholders
4. All placeholders are resolved after merging
5. Underscore-based ENV resolution is applied last

### Precedence Example

**Example 1: Profile override with placeholder**
- Base config: `username: ${DB_USERNAME:postgres}`
- Production config: `username: ${PROD_DB_USERNAME:prod_user}`
- ENV vars: `PROD_DB_USERNAME=actual_prod`

Result in production: `username: "actual_prod"` (profile file overrides base, then placeholder resolves)

**Example 2: Underscore-based ENV override**
- Base config: `host: localhost`
- ENV vars: `DATABASES_CONNECTIONS_SERHAFEN_US_HOST=prod-server`

Result: `host: "prod-server"` (underscore-based ENV overrides file value)

## Validation

### Simple Properties (Works)

For simple configuration properties, validation works as expected:

```typescript
@ConfigurationProperties('server')
export class ServerConfig {
  @ConfigProperty()
  @Required()
  host: string;

  @ConfigProperty()
  @DefaultValue(3000)
  port: number = 3000;
}
```

### Map/Record Properties (Manual Validation Required)

**This example uses `validateOnBind: false`** because automatic validation doesn't work for Map/Record types.

The `@Required()` decorator only validates that the Map/Record property exists, NOT the contents:

```typescript
@ConfigProperty('connections')
@Required()  // ✅ Checks if 'connections' exists
connections: Map<string, DatabaseConnection>;  // ❌ Doesn't validate entries
```

**What this means**:
- Missing fields in entries (e.g., no `port`) won't cause errors
- Invalid values (e.g., `port: 99999`) won't be caught
- You'll get `undefined` or invalid data at runtime

**Manual Validation Pattern** (see `main.ts`):

```typescript
const databasesConfig = configManager.bind(DatabasesConfig);

// Validate each entry manually
for (const [name, conn] of databasesConfig.connections) {
  if (!conn.host) {
    throw new Error(`Database '${name}' missing host`);
  }
  if (!conn.port || conn.port < 1 || conn.port > 65535) {
    throw new Error(`Database '${name}' invalid port: ${conn.port}`);
  }
  // ... more validation
}
```

**Alternative**: If validation is critical, use individual properties instead of Map/Record:

```typescript
@ConfigurationProperties('databases')
class DatabasesConfig {
  @ValidateNested()
  @Type(() => DatabaseConnection)
  primary: DatabaseConnection;  // ✅ Validates automatically
  
  @ValidateNested()
  @Type(() => DatabaseConnection)
  replica: DatabaseConnection;   // ✅ Validates automatically
}
```

## Map vs Record

This example uses `Map<string, T>`. An alternative is `Record<string, T>` (plain object).

**See [MAP_VS_RECORD.md](./MAP_VS_RECORD.md) for a detailed comparison.**

Quick summary:
- **Map**: True Map type with `.get()`, `.set()` methods - no automatic validation
- **Record**: Plain object with bracket notation - no automatic validation either

**Both require manual validation** due to class-validator limitations with dynamic keys.

## Known Limitations

### 1. Map/Record Entry Validation

**Automatic validation of Map/Record entries is NOT supported.**

This is a limitation of class-validator, which requires known properties at compile time. Since Map/Record have dynamic keys, validation must be done manually.

**Impact**:
- Missing fields in entries won't cause startup errors
- Invalid values won't be caught automatically
- Runtime errors may occur if you don't validate manually

**Solution**: See the manual validation example in `main.ts`

### 2. Type Safety at Runtime

TypeScript provides compile-time type safety, but runtime validation requires manual checks or a different structure (individual properties instead of Map/Record).

## Error Handling

### Missing Required Environment Variables

If a placeholder has no fallback and the ENV var is not set:

```yaml
password: ${PROD_DB_PASSWORD}  # No fallback
```

The field becomes `undefined`. Since validation is disabled in this example, you'll need to check for undefined values manually.

### Invalid Map Structures

If configuration doesn't match the expected structure (e.g., wrong types), the binding may fail or produce unexpected results. Use TypeScript types and validation decorators to catch these issues early.

## Best Practices

1. **Use fallbacks for development**: `${VAR:dev_value}`
2. **Omit fallbacks for production secrets**: `${PROD_SECRET}`
3. **Use Map for collections**: Instead of `db1`, `db2`, `db3` properties
4. **Profile-specific placeholders**: Override which ENV vars are used per environment
5. **Understand precedence**: Underscore-based ENV (priority 200) overrides file values, then placeholders resolve
6. **Use placeholders for custom ENV var names**: `${CUSTOM_VAR}` instead of relying on `PATH_TO_PROPERTY` convention
7. **Use underscore-based for quick overrides**: Set `DATABASE_HOST` to override `database.host` without changing files

## Learn More

- [Map vs Record Comparison](./MAP_VS_RECORD.md) - Choose the right approach for your needs
- [Type Config Documentation](../../README.md)
- [Placeholder Resolution Guide](../../packages/core/PLACEHOLDER_RESOLUTION.md)
- [Configuration Files Guide](../../packages/core/CONFIG_FILES.md)
