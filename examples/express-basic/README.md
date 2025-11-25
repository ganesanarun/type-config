# Express Basic Example

Basic Express.js application using Type Config.

## Setup

```bash
yarn install
```

## Run

```bash
# Development
yarn dev

# Production
NODE_ENV=production yarn dev
```

## Try It

```bash
# Get config
curl http://localhost:3000/config

# Health check
curl http://localhost:3000/health
```

## Features Demonstrated

- ✅ Type-safe configuration classes
- ✅ Profile-based configuration  
- ✅ Hot reload (try editing config/application.yml)
- ✅ Validation with class-validator
- ✅ DI injection into Express middleware
