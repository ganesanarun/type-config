# Changes Made to Fix Issues

## Issues Fixed

### 1. Validation Error
**Problem**: `Validation failed for DatabasesConfig: undefined: an unknown value was passed to the validate function`

**Root Cause**: The `@Validate()` decorator was trying to validate Map properties, but class-validator doesn't support validating Map types directly.

**Solution**: 
- Removed `@Validate()` decorator from config classes with Map properties
- Set `validateOnBind: false` in TypeConfigModule configuration
- Removed validation decorators from nested classes
- The config classes still use `@Required()` and `@DefaultValue()` for basic configuration management

### 2. Precedence Documentation
**Problem**: Documentation incorrectly stated that explicit placeholders take precedence over underscore-based ENV resolution.

**Root Cause**: Misunderstanding of the actual implementation. According to `PLACEHOLDER_RESOLUTION.md`, the resolution order is:
1. Load and merge all sources (underscore-based ENV has priority 200)
2. Resolve explicit placeholders in the merged result
3. Decrypt if needed

**Solution**: Updated all documentation to reflect the correct precedence:
- **Underscore-based ENV variables** (priority 200) override file values
- **Profile-specific files** (priority 150) override base files
- **Base files** (priority 100)
- **Placeholder resolution** happens after merging
- **Default values** from decorators (lowest priority)

## Files Modified

### Configuration Classes (Simplified)
- `src/config/database.config.ts` - Removed `@Validate()` decorator and validation decorators
- `src/config/services.config.ts` - Removed `@Validate()` decorator and validation decorators
- `src/config/server.config.ts` - Removed unnecessary validation decorators
- `src/config/features.config.ts` - Removed unnecessary validation decorators
- `src/app.module.ts` - Set `validateOnBind: false`

### Documentation (Corrected Precedence)
- `README.md` - Updated precedence rules and examples
- `QUICKSTART.md` - Updated precedence scenarios and examples

## How It Works Now

### Configuration Resolution Flow

1. **Load Sources**:
   - `application.yml` (priority 100)
   - `application-production.yml` (priority 150, if NODE_ENV=production)
   - EnvConfigSource (priority 200) - converts `DATABASE_HOST` → `database.host`

2. **Merge by Priority**:
   - Higher priority sources override lower priority
   - EnvConfigSource (200) overrides profile files (150) which override base files (100)

3. **Resolve Placeholders**:
   - Scan merged config for `${VAR:fallback}` patterns
   - Resolve each placeholder by looking up ENV var
   - If ENV var exists: use its value
   - If ENV var doesn't exist and fallback provided: use fallback
   - If ENV var doesn't exist and no fallback: field becomes `undefined`

4. **Bind to Classes**:
   - Convert plain objects to Map instances where needed
   - Apply default values from decorators
   - Validate required fields

### Example Scenarios

#### Scenario 1: Underscore-Based Override
```yaml
# application.yml
database:
  host: localhost
```

```bash
DATABASE_HOST=prod-server yarn dev
```

**Result**: `database.host = "prod-server"` (underscore-based ENV overrides file)

#### Scenario 2: Placeholder Resolution
```yaml
# application.yml
database:
  host: ${DB_HOST:localhost}
```

```bash
DB_HOST=prod-server yarn dev
```

**Result**: `database.host = "prod-server"` (placeholder resolves to ENV var)

#### Scenario 3: Underscore-Based Sets Value with Placeholder
```yaml
# application.yml
database:
  url: file-value
```

```bash
DATABASE_URL='postgres://${DB_USER:admin}@localhost/mydb' DB_USER=root yarn dev
```

**Result**: `database.url = "postgres://root@localhost/mydb"`

**Explanation**:
1. EnvConfigSource sets `database.url = "postgres://${DB_USER:admin}@localhost/mydb"` (overrides file)
2. Placeholder resolution resolves `${DB_USER:admin}` to `root`

## Testing

The example should now run without validation errors:

```bash
cd examples/map-and-placeholders
yarn dev
```

You should see output showing all database connections, service endpoints, and feature flags with their resolved values.

## Key Takeaways

1. **Underscore-based ENV resolution happens first** (priority 200) and can override file values
2. **Placeholder resolution happens after merging** and resolves `${VAR:fallback}` in the merged config
3. **Both mechanisms work together**: Underscore-based ENV can set values that contain placeholders
4. **Nested classes in Maps don't need validation decorators** - they're plain data classes
5. **Top-level config classes use `@Required()` and `@DefaultValue()`** for basic validation
6. **Map validation limitation**: `@Required()` only validates that the Map exists, not its contents
7. **Manual validation recommended**: For production, add custom validation logic for Map entries

## Known Limitations

### Map Entry Validation

The `@Required()` decorator on the `connections` property only ensures the Map itself exists. It does NOT validate:
- Whether map entries have all required fields
- Whether field types are correct
- Whether field values are valid

**Example**: If you remove `port` from a database connection in the YAML, the application will still start. The `port` field will be `undefined` at runtime.

**Workaround**: The example includes manual validation in `main.ts` that checks each map entry and logs warnings for missing fields. For production use, you should:
1. Implement custom validation logic
2. Throw errors for invalid configurations
3. Or use a different structure if strict validation is critical
