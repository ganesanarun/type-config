# Configuration File Management Guide

This guide explains how to properly manage configuration files (YAML, JSON) in your application, especially when using TypeScript compilation and build processes.

## Table of Contents

- [Overview](#overview)
- [File Structure](#file-structure)
- [The Build Problem](#the-build-problem)
- [Solutions by Framework](#solutions-by-framework)
- [Configuration Directory Resolution](#configuration-directory-resolution)
- [Profile-Based Loading](#profile-based-loading)
- [Troubleshooting](#troubleshooting)

## Overview

Type Config loads configuration from files (YAML, JSON) at runtime. However, **TypeScript compilation and build tools often delete or don't copy these files to the output directory**, causing runtime errors.

**This is critical**: Your application will fail to start if configuration files are not available at runtime.

## File Structure

Recommended project structure:

```
your-project/
├── src/
│   ├── config/
│   │   ├── application.yml              # Base configuration
│   │   ├── application-development.yml  # Development overrides
│   │   ├── application-production.yml   # Production overrides
│   │   └── application-staging.yml      # Staging overrides
│   ├── index.ts
│   └── ...
├── dist/                                # Build output
│   ├── src/
│   │   ├── config/      # ⚠️ Config files MUST be wherever it's supposed to be.
│   │   │   ├── application.yml
│   │   │   └── ...
│   │   └── ...
└── package.json
```

## The Build Problem

### Why Configuration Files Disappear

1. **TypeScript only compiles `.ts` files** - YAML/JSON files are ignored
2. **Build tools clear output directories** - `dist/` is often deleted before each build
3. **Watch mode doesn't track non-TS files** - Changes to config files aren't detected

### Symptoms

```
Error: ENOENT: no such file or directory, open 'dist/src/config/application.yml'
Error: Required configuration property 'database.host' is missing
```


## Solutions by Framework

### NestJS

#### Solution 1: Configure nest-cli.json (Recommended)

Add assets configuration to automatically copy config files during build:

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "assets": [
      {
        "include": "config/*.yml",
        "outDir": "dist/src"
      },
      {
        "include": "config/*.json",
        "outDir": "dist/src"
      }
    ]
  }
}
```

#### Solution 2: Package.json Scripts

```json
{
  "scripts": {
    "copy:config": "mkdir -p dist/src/config && cp src/config/*.{yml,json} dist/src/config/",
    "build": "nest build && npm run copy:config",
    "start:dev": "npm run copy:config && nest start --watch",
    "start:prod": "node dist/src/main"
  }
}
```

#### Configuration in Code

```typescript
import { Module } from '@nestjs/common';
import { TypeConfigModule } from '@snow-tzu/type-config-nestjs';
import * as path from 'path';

@Module({
  imports: [
    TypeConfigModule.forRoot({
      profile: process.env.NODE_ENV || 'development',
      // __dirname in compiled code = dist/src
      configDir: path.join(__dirname, 'config'),
      isGlobal: true,
    }),
  ]
})
export class AppModule {}
```

### Express

#### Solution: Package.json Scripts

```json
{
  "scripts": {
    "copy:config": "mkdir -p dist/config && cp config/*.{yml,json} dist/config/",
    "build": "tsc && npm run copy:config",
    "start": "npm run copy:config && node dist/index.js",
    "dev": "npm run copy:config && ts-node src/index.ts"
  }
}
```

#### Configuration in Code

```typescript
import express from 'express';
import { createTypeConfig } from '@snow-tzu/type-config-express';
import * as path from 'path';

const app = express();

const config = await createTypeConfig({
  profile: process.env.NODE_ENV || 'development',
  // In development: ./config
  // In production: dist/config
  configDir: path.join(__dirname, '../config'),
  configClasses: [ServerConfig, DatabaseConfig]
});
```

### Fastify

#### Solution: Package.json Scripts

```json
{
  "scripts": {
    "copy:config": "mkdir -p dist/config && cp config/*.{yml,json} dist/config/",
    "build": "tsc && npm run copy:config",
    "start": "npm run copy:config && node dist/index.js",
    "dev": "npm run copy:config && ts-node src/index.ts"
  }
}
```

#### Configuration in Code

```typescript
import Fastify from 'fastify';
import { fastifyTypeConfig } from '@snow-tzu/type-config-fastify';
import * as path from 'path';

const fastify = Fastify();

await fastify.register(fastifyTypeConfig, {
  profile: process.env.NODE_ENV || 'development',
  configDir: path.join(__dirname, '../config'),
  configClasses: [ServerConfig, DatabaseConfig]
});
```

### Vanilla Node.js / TypeScript

#### Solution: Package.json Scripts

```json
{
  "scripts": {
    "copy:config": "mkdir -p dist/config && cp config/*.{yml,json} dist/config/",
    "build": "tsc && npm run copy:config",
    "start": "npm run copy:config && node dist/index.js"
  }
}
```

#### Configuration in Code

```typescript
import { ConfigurationBuilder } from '@snow-tzu/type-config';
import * as path from 'path';

const { configManager, container } = await new ConfigurationBuilder()
  .withProfile(process.env.NODE_ENV || 'development')
  .withConfigDir(path.join(__dirname, '../config'))
  .registerConfig(ServerConfig)
  .build();
```


## Configuration Directory Resolution

### Understanding __dirname

The `__dirname` variable points to different locations depending on execution context:

| Context | __dirname Value | Config Location |
|---------|----------------|-----------------|
| Development (ts-node) | `src/` | `src/config/` |
| Development (nest start) | `dist/src/` | `dist/src/config/` |
| Production (compiled) | `dist/` or `dist/src/` | `dist/config/` or `dist/src/config/` |

### Recommended Patterns

#### Pattern 1: Relative to Compiled File (Recommended)

```typescript
import * as path from 'path';

const configDir = path.join(__dirname, 'config');
// Development: dist/src/config
// Production: dist/src/config
```

**Pros**: Works consistently in both dev and prod  
**Cons**: Requires config files in dist/src/config

#### Pattern 2: Relative to Project Root

```typescript
import * as path from 'path';

const configDir = path.join(process.cwd(), 'config');
// Always: {project-root}/config
```

**Pros**: Simple, config stays in root  
**Cons**: Assumes current working directory is project root

#### Pattern 3: Environment-Based

```typescript
import * as path from 'path';

const configDir = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, 'config')
  : path.join(process.cwd(), 'src/config');
```

**Pros**: Flexible for different environments  
**Cons**: More complex, harder to maintain

### Best Practice

Use Pattern 1 with proper build configuration:

```typescript
// Always use this pattern
configDir: path.join(__dirname, 'config')
```

Then ensure your build process copies files to the correct location.

## Profile-Based Loading

Configuration files are loaded and merged in priority order (later overrides earlier):

1. **Base**: `application.yml` or `application.json`
2. **Profile**: `application-{profile}.yml` or `application-{profile}.json`
3. **Environment Variables**: Highest priority

### Example

With `NODE_ENV=production`:

```yaml
# 1. application.yml (loaded first)
server:
  host: localhost
  port: 3000
database:
  host: localhost
  port: 5432

# 2. application-production.yml (overrides base)
server:
  host: 0.0.0.0
  port: 8080
database:
  host: prod-db.example.com

# 3. Environment variables (highest priority)
# DATABASE_PASSWORD=secret123
```

**Final merged configuration**:
```yaml
server:
  host: 0.0.0.0        # from production profile
  port: 8080           # from production profile
database:
  host: prod-db.example.com  # from production profile
  port: 5432           # from base
  password: secret123  # from environment variable
```


## Troubleshooting

### Error: "ENOENT: no such file or directory"

**Symptom**:
```
Error: ENOENT: no such file or directory, open '/path/to/dist/config/application.yml'
```

**Causes & Solutions**:

1. **Config files not copied to dist/**
   - ✅ Add copy script to package.json
   - ✅ Configure build tool to copy assets (nest-cli.json for NestJS)
   - ✅ Verify files exist: `ls dist/src/config/` or `ls dist/config/`

2. **Wrong configDir path**
   - ✅ Use `path.join(__dirname, 'config')` instead of relative paths
   - ✅ Check where __dirname points in your environment
   - ✅ Add debug logging: `console.log('Config dir:', configDir)`

3. **Build process deletes files**
   - ✅ Ensure copy happens AFTER build
   - ✅ For NestJS: use nest-cli.json assets configuration
   - ✅ For others: `"build": "tsc && npm run copy:config"`

### Error: "Required configuration property 'xxx' is missing"

**Symptom**:
```
Error: Required configuration property 'database.host' is missing
```

**Causes & Solutions**:

1. **Configuration file is empty or not parsed**
   - ✅ Verify YAML/JSON syntax is valid
   - ✅ Check file has content: `cat dist/src/config/application.yml`
   - ✅ Ensure file extension is correct (.yml, .yaml, or .json)

2. **Wrong profile loaded**
   - ✅ Check NODE_ENV value: `echo $NODE_ENV`
   - ✅ Verify profile-specific file exists
   - ✅ Add logging to see which files are loaded

3. **Property path mismatch**
   - ✅ Ensure @ConfigurationProperties prefix matches YAML structure
   - ✅ Check @ConfigProperty names match YAML keys
   - ✅ Example:
     ```typescript
     @ConfigurationProperties('database')  // Must match YAML
     class DatabaseConfig {
       @ConfigProperty('host')  // Must match: database.host
       host: string;
     }
     ```

### Configuration not updating in development

**Symptom**: Changes to config files don't take effect

**Causes & Solutions**:

1. **Watch mode doesn't copy files**
   - ✅ Run copy script before starting: `npm run copy:config && npm run dev`
   - ✅ Or use hot reload: `enableHotReload: true`

2. **Cached configuration**
   - ✅ Restart the application
   - ✅ Clear dist folder: `rm -rf dist && npm run build`

3. **Wrong file being read**
   - ✅ Add debug logging to see which file is loaded
   - ✅ Check if profile-specific file overrides your changes

### Files copied but still not found

**Symptom**: Files exist in dist/ but application can't find them

**Causes & Solutions**:

1. **Working directory mismatch**
   - ✅ Check current working directory: `console.log(process.cwd())`
   - ✅ Use absolute paths: `path.join(__dirname, 'config')`
   - ✅ Don't rely on relative paths like `./config`

2. **Incorrect path in configDir**
   - ✅ Verify: `console.log('Looking for config at:', configDir)`
   - ✅ Check file exists: `fs.existsSync(path.join(configDir, 'application.yml'))`

3. **Symlink or Docker volume issues**
   - ✅ Use absolute paths
   - ✅ Verify files are actually copied (not just linked)
   - ✅ Check Docker volume mounts

## Quick Checklist

Before deploying or running your application:

- [ ] Configuration files exist in source (`src/config/` or `config/`)
- [ ] Build script copies config files to dist
- [ ] Verify files in dist: `ls dist/src/config/` or `ls dist/config/`
- [ ] configDir path uses `path.join(__dirname, 'config')`
- [ ] YAML/JSON syntax is valid
- [ ] Profile-specific files exist for your environment
- [ ] @ConfigurationProperties prefix matches YAML structure
- [ ] Required properties have values in config files
- [ ] Environment variables are set (if needed)

## Additional Resources

- [Core Package README](./README.md)
- [NestJS Package README](../nestjs/README.md)
- [Express Package README](../express/README.md)
- [Fastify Package README](../fastify/README.md)
- [Examples Directory](../../examples/)

## Need Help?

If you're still having issues:

1. Enable debug logging in your application
2. Check the [GitHub Issues](https://github.com/snow-tzu/type-config/issues)
3. Review the [examples directory](../../examples/) for working configurations
4. Create a minimal reproduction case

