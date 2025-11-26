# Quick Start Guide

This guide will help you quickly test the Map and Placeholders example.

## Prerequisites

Make sure you're in the example directory:

```bash
cd examples/map-and-placeholders
```

## 1. Basic Run (Development Mode)

Run with default configuration and fallback values:

```bash
yarn dev
```

You should see output showing:
- 3 database connections (serhafen-us, serhafen-ag, analytics)
- 3 service endpoints (auth-service, payment-service, notification-service)
- Feature flags
- All using fallback values from the YAML files

## 2. Test with Environment Variables

### Override a Single Value

```bash
DB_US_HOST=custom-database.com yarn dev
```

Notice that only the `serhafen-us` host changes to `custom-database.com`.

### Override Multiple Values

```bash
DB_US_HOST=db1.example.com \
DB_AG_HOST=db2.example.com \
AUTH_SERVICE_URL=http://auth.example.com:9000 \
yarn dev
```

### Test Underscore-Based ENV Resolution

Type Config also supports underscore-based environment variable resolution (priority 200):

```bash
DATABASES_POOL_MIN=5 \
DATABASES_POOL_MAX=20 \
yarn dev
```

Notice the pool settings change. Underscore-based ENV vars override file values.

**⚠️ Known Limitation with Kebab-Case Keys**:

Underscore-based ENV resolution doesn't work correctly with kebab-case map keys:

```bash
# ❌ This DOESN'T work - creates wrong path (databases.connections.serhafen.us.host)
DATABASES_CONNECTIONS_SERHAFEN_US_HOST=override-host

# ✅ Use explicit placeholder instead
DB_US_HOST=override-host  # Requires: host: ${DB_US_HOST:localhost} in YAML
```

For map keys with hyphens, always use explicit placeholders in your YAML.

If the file has a placeholder, the underscore-based ENV can set the value that gets resolved:

```bash
# File has: username: ${DB_US_USERNAME:postgres}
# This sets the value that the placeholder resolves to
DB_US_USERNAME=myuser \
yarn dev
```

## 3. Test Production Profile

Run with production profile to see different placeholders:

```bash
NODE_ENV=production yarn dev
```

**Note**: This will fail because production requires certain ENV vars without fallbacks:
- `PROD_DB_US_PASSWORD`
- `PROD_DB_AG_PASSWORD`
- `PROD_DB_ANALYTICS_PASSWORD`

### Run Production with Required Variables

```bash
PROD_DB_US_PASSWORD=secret1 \
PROD_DB_AG_PASSWORD=secret2 \
PROD_DB_ANALYTICS_PASSWORD=secret3 \
NODE_ENV=production yarn dev
```

Now it works! Notice:
- Different hosts (prod-db-us.example.com instead of localhost)
- SSL enabled
- Different pool settings
- Different service URLs

## 4. Test the API

Once the server is running, open another terminal and test the endpoints:

### View All Configuration

```bash
curl http://localhost:3000/config | jq
```

### Get Specific Database Connection

```bash
curl http://localhost:3000/database/serhafen-us | jq
curl http://localhost:3000/database/serhafen-ag | jq
curl http://localhost:3000/database/analytics | jq
```

### Get Specific Service Endpoint

```bash
curl http://localhost:3000/service/auth-service | jq
curl http://localhost:3000/service/payment-service | jq
curl http://localhost:3000/service/notification-service | jq
```

### Test Non-Existent Keys

```bash
curl http://localhost:3000/database/nonexistent | jq
# Returns: {"error": "Database connection 'nonexistent' not found"}
```

## 5. Experiment with Placeholders

### Test Fallback Values

Create a test with missing ENV var:

```bash
# DB_MISSING is not set, so fallback "fallback-value" is used
# Edit application.yml temporarily to add: test: ${DB_MISSING:fallback-value}
```

### Test Without Fallback

```bash
# This will make the field undefined (validation may fail if required)
# Edit application.yml temporarily to add: test: ${DB_MISSING}
```

### Test Multiple Placeholders in One Value

Edit `application.yml` temporarily:

```yaml
server:
  name: ${APP_NAME:myapp}-${ENV:dev}-${VERSION:1.0}
```

Then run:

```bash
APP_NAME=testapp ENV=staging VERSION=2.0 yarn dev
# Server name will be: testapp-staging-2.0
```

## 6. Understanding Precedence

### Scenario 1: Underscore-Based ENV Override

Base config: `host: localhost`
ENV vars: `DATABASES_CONNECTIONS_SERHAFEN_US_HOST=prod-server`

Result: `host: "prod-server"` (underscore-based ENV overrides file)

### Scenario 2: Placeholder Resolution

Base config: `username: ${DB_USERNAME:postgres}`
ENV vars: `DB_USERNAME=myuser`

Result: `username: "myuser"` (placeholder resolves to ENV var)

### Scenario 3: Profile Override with Placeholder

Base config: `username: ${DB_USERNAME:postgres}`
Production config: `username: ${PROD_DB_USERNAME:prod_user}`
ENV vars: `PROD_DB_USERNAME=actual_prod`

Result in production: `username: "actual_prod"` (profile overrides base, then placeholder resolves)

### Scenario 4: Underscore-Based with Placeholder

Base config: `url: ${API_URL:http://localhost}`
ENV vars: `DATABASES_CONNECTIONS_SERHAFEN_US_URL=http://prod`, `API_URL=http://staging`

Result: `url: "http://prod"` (underscore-based ENV sets the value, which contains no placeholder)

## 7. Common Use Cases

### Multi-Region Databases

```bash
DB_US_HOST=us-east-1.rds.amazonaws.com \
DB_AG_HOST=eu-central-1.rds.amazonaws.com \
DB_ANALYTICS_HOST=analytics.internal.com \
yarn dev
```

### Service Discovery

```bash
AUTH_SERVICE_URL=http://auth-service:8001 \
PAYMENT_SERVICE_URL=http://payment-service:8002 \
NOTIFICATION_SERVICE_URL=http://notification-service:8003 \
yarn dev
```

### Feature Flags

```bash
FEATURE_NEW_UI=true \
FEATURE_BETA=true \
yarn dev
```

## 8. Troubleshooting

### Missing Fields in Map Entries

If you remove a field from a map entry (e.g., remove `port` from a database connection), the application will still start but you'll see a warning:

```
⚠️  Database 'serhafen-ag' missing fields: port
```

This is because `validateOnBind: false` is set. The manual validation in `main.ts` catches these issues and logs warnings.

### "Required configuration property is missing"

This means the entire Map is missing (e.g., no `connections` property at all). The `@Required()` decorator only validates that the Map exists, not its contents.

### Port already in use

```bash
SERVER_PORT=3001 yarn dev
```

## Next Steps

1. Read the full [README.md](./README.md) for detailed documentation
2. **Compare Map vs Record** in [MAP_VS_RECORD.md](./MAP_VS_RECORD.md) to choose the best approach
3. Explore the configuration classes in `src/config/`
4. Modify the YAML files to test different scenarios
5. Check out the [Type Config documentation](../../README.md)

## Tips

- Use `.env` files for local development (copy from `.env.example`)
- Use explicit placeholders for important configuration
- Use underscore-based ENV for convenience overrides
- Always provide fallbacks for development, omit them for production secrets
- Use Map-based config for collections of similar entities
