# @snow-tzu/type-config-remote

> **Type-safe, multi-source, remote configuration for Node.js & TypeScript**

[![npm version](https://img.shields.io/npm/v/@snow-tzu/type-config-remote.svg)](https://www.npmjs.com/package/@snow-tzu/type-config-remote)
[![license](https://img.shields.io/npm/l/@snow-tzu/type-config-remote.svg)](LICENSE)
[![downloads](https://img.shields.io/npm/dm/@snow-tzu/type-config-remote.svg)](https://www.npmjs.com/package/@snow-tzu/type-config-remote)

---

## Why use this?

- **Remote sources**: AWS Parameter Store, Consul, etcd, Spring Cloud Config
- **Type-safe**: Decorator-based config classes with TypeScript
- **Multi-source**: Merge remote, YAML, JSON, .env, env vars
- **Profile support**: Spring-style profiles for dev, prod, etc.
- **Encryption**: Secure secrets with built-in AES-256
- **Validation**: class-validator integration
- **Priority merging**: Fine-grained control over config precedence

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [AWS Parameter Store](#aws-parameter-store)
- [HashiCorp Consul](#hashicorp-consul)
- [etcd](#etcd)
- [Who is this for?](#who-is-this-for)
- [Comparison](#comparison)
- [License](#license)

## Features

- AWS Parameter Store integration
- Consul KV store integration
- etcd key-value store integration
- Priority-based source merging
- Secure secret decryption
- Custom client support

## Installation

```bash
npm install @snow-tzu/type-config-remote @snow-tzu/type-config
# or
yarn add @snow-tzu/type-config-remote @snow-tzu/type-config

# Install the remote source you need:
npm install @aws-sdk/client-ssm  # For AWS Parameter Store
npm install consul               # For Consul
npm install etcd3                # For etcd
```

## AWS Parameter Store

Load configuration from AWS Systems Manager Parameter Store.

```typescript
import { ConfigurationBuilder } from '@snow-tzu/type-config';
import { AWSParameterStoreSource } from '@snow-tzu/type-config-remote';

const config = await new ConfigurationBuilder()
  .addSource(new AWSParameterStoreSource({
    path: '/myapp/production',
    region: 'us-east-1',
    recursive: true,
    decryptSecrets: true,
    priority: 300
  }))
  .build();
```

### Parameter Store Structure

Parameters in AWS Parameter Store:

```
/myapp/production/database/host = "prod-db.example.com"
/myapp/production/database/port = "5432"
/myapp/production/server/port = "8080"
```

Maps to configuration:

```json5
{
  database: {
    host: "prod-db.example.com",
    port: "5432",
  },
  server: {
    port: "8080"
  }
}
```

### Options

- `path: string` - Base path in Parameter Store (required)
- `region?: string` - AWS region (default: 'us-east-1')
- `recursive?: boolean` - Load parameters recursively (default: true)
- `decryptSecrets?: boolean` - Decrypt SecureString parameters (default: true)
- `priority?: number` - Source priority (default: 300)
- `client?: SSMClient` - Custom SSM client instance

### With Custom Credentials

```typescript
import { SSMClient } from '@aws-sdk/client-ssm';

const ssmClient = new SSMClient({
  region: 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});

const source = new AWSParameterStoreSource({
  path: '/myapp/production',
  client: ssmClient
});
```

## HashiCorp Consul

Load configuration from Consul KV store.

```typescript
import { ConsulSource } from '@snow-tzu/config/remote';

const config = await new ConfigurationBuilder()
  .addSource(new ConsulSource({
    prefix: 'myapp/production',
    host: 'localhost',
    port: 8500,
    format: 'json',
    priority: 300
  }))
  .build();
```

### Consul KV Structure

Keys in Consul:

```
myapp/production/database/host = "prod-db.example.com"
myapp/production/database/port = "5432"
myapp/production/config = '{"server": {"port": 8080}}'
```

### Options

- `prefix: string` - Key prefix in Consul (required)
- `host?: string` - Consul host (default: 'localhost')
- `port?: number` - Consul port (default: 8500)
- `secure?: boolean` - Use HTTPS (default: false)
- `token?: string` - Consul ACL token
- `format?: 'json' | 'yaml' | 'properties'` - Value format (default: plain string)
- `priority?: number` - Source priority (default: 300)
- `client?: Consul` - Custom Consul client instance

### With ACL Token

```typescript
const source = new ConsulSource({
  prefix: 'myapp/production',
  host: 'consul.example.com',
  port: 8500,
  secure: true,
  token: process.env.CONSUL_TOKEN
});
```

## etcd

Load configuration from the etcd key-value store.

```typescript
import { EtcdSource } from '@snow-tzu/config/remote';

const config = await new ConfigurationBuilder()
  .addSource(new EtcdSource({
    prefix: '/myapp/production',
    hosts: 'localhost:2379',
    priority: 300
  }))
  .build();
```

### etcd Key Structure

Keys in etcd:

```
/myapp/production/database/host = "prod-db.example.com"
/myapp/production/database/port = 5432
/myapp/production/server = '{"port": 8080}'
```

### Options

- `prefix: string` - Key prefix in etcd (required)
- `hosts?: string | string[]` - etcd endpoints (default: 'localhost:2379')
- `credentials?: object` - TLS credentials
    - `rootCertificate?: Buffer`
    - `privateKey?: Buffer`
    - `certChain?: Buffer`
- `auth?: object` - Authentication
    - `username: string`
    - `password: string`
- `priority?: number` - Source priority (default: 300)
- `client?: Etcd3` - Custom etcd3 client instance

### With TLS and Authentication

```typescript
import * as fs from 'fs';

const source = new EtcdSource({
  prefix: '/myapp/production',
  hosts: ['etcd1.example.com:2379', 'etcd2.example.com:2379'],
  credentials: {
    rootCertificate: fs.readFileSync('./ca.crt'),
    privateKey: fs.readFileSync('./client.key'),
    certChain: fs.readFileSync('./client.crt')
  },
  auth: {
    username: 'myapp',
    password: process.env.ETCD_PASSWORD!
  }
});
```

## Using with Express

```typescript
import { createSpringConfig } from '@snow-tzu/config/express';
import { AWSParameterStoreSource } from '@snow-tzu/config/remote';

const config = await createSpringConfig({
  profile: 'production',
  configDir: './config',
  additionalSources: [
    new AWSParameterStoreSource({
      path: '/myapp/production',
      region: 'us-east-1'
    })
  ],
  configClasses: [DatabaseConfig, ServerConfig]
});
```

## Using with NestJS

```typescript
import { SpringConfigModule } from '@snow-tzu/config/nestjs';
import { ConsulSource } from '@snow-tzu/config/remote';

@Module({
  imports: [
    SpringConfigModule.forRoot({
      profile: 'production',
      additionalSources: [
        new ConsulSource({
          prefix: 'myapp/production',
          host: 'consul.example.com'
        })
      ]
    })
  ]
})
export class AppModule {
}
```

## Priority and Source Merging

Sources are merged based on priority (lower numbers load first, higher numbers override):

- File sources: 100-150
- Environment variables: 200
- Remote sources: 300 (default)

```typescript
const config = await new ConfigurationBuilder()
  .addSource(new FileConfigSource('./config/base.yml', 100))
  .addSource(new ConsulSource({ prefix: 'myapp/shared', priority: 250 }))
  .addSource(new AWSParameterStoreSource({ path: '/myapp/prod', priority: 350 }))
  .build();
```

Load order: File → Consul → AWS Parameter Store (highest priority wins)

## Error Handling

All remote sources throw errors if they fail to connect or load. Handle errors appropriately:

```typescript
try {
  const config = await new ConfigurationBuilder()
    .addSource(new ConsulSource({ prefix: 'myapp' }))
    .build();
} catch (error) {
  console.error('Failed to load remote config:', error);
  // Fall back to local config or exit
}
```

## Best Practices

1. **Use environment-specific prefixes** - `/myapp/production`, `/myapp/staging`
2. **Set appropriate priorities** - Remote sources should override local config
3. **Secure your credentials** - Use IAM roles, service accounts, or secret managers
4. **Handle failures gracefully** - Have fallback configurations
5. **Monitor remote source latency** - Remote loads can slow down startup

## Complete Example

See the **[NestJS Remote Example](https://github.com/ganesanarun/type-config/blob/main/examples/nestjs-remote)** for a fully working application demonstrating remote
configuration:

### Features Demonstrated

- Spring Cloud Config Server integration
- Automatic config refresh with polling
- Fallback to local configuration files
- Bearer token authentication
- Manual refresh endpoint
- Profile-based remote configuration
- Error handling and retry logic
- Combined local + remote sources

### Example Setup

**Remote Config Source Configuration:**

```typescript
import { SpringConfigModule } from '@snow-tzu/config-nestjs';
import { RemoteConfigSource } from '@snow-tzu/config-remote';

@Module({
  imports: [
    TypeConfigModule.forRootAsync({
      useFactory: async () => ({
        profile: process.env.NODE_ENV || 'development',
        configDir: './config', // Local fallback
        additionalSources: [
          new RemoteConfigSource({
            url: process.env.CONFIG_SERVER_URL || 'http://localhost:8888',
            name: 'nestjs-app',
            profile: process.env.NODE_ENV || 'development',
            token: process.env.CONFIG_SERVER_TOKEN,
            pollInterval: 30000, // Auto-refresh every 30 seconds
            priority: 350, // Higher than local files
          })
        ]
      }),
      isGlobal: true,
    }),
  ],
})
export class AppModule {
}
```

**Running the Example:**

```bash
cd examples/nestjs-remote

# Set environment variables
export CONFIG_SERVER_URL=http://localhost:8888
export CONFIG_SERVER_TOKEN=your-token  # optional
export NODE_ENV=production

yarn install
yarn dev
```

**Test Endpoints:**

- `GET /` - Welcome message
- `GET /config` - View current configuration (local + remote merged)
- `GET /health` - Health check

### Mock Config Server Response

If you're building your own config server, here's the expected response format:

```json
{
  "name": "nestjs-app",
  "profiles": [
    "production"
  ],
  "label": "main",
  "propertySources": [
    {
      "name": "file:///config/application-production.yml",
      "source": {
        "server.port": 3001,
        "server.host": "0.0.0.0",
        "database.host": "remote-db.example.com",
        "database.port": 5432,
        "database.username": "remote_user",
        "database.password": "remote_password"
      }
    }
  ]
}
```

### Priority Merging Example

With the remote example, the configuration is merged in this order:

1. **Local base** (`application.yml`) - Priority 100
2. **Local profile** (`application-production.yml`) - Priority 120
3. **Environment variables** - Priority 200
4. **Remote config** - Priority 350 (highest)

Remote values override all others.

### AWS Parameter Store Example

See the remote example's README for AWS Parameter Store setup:

```typescript
import { AWSParameterStoreSource } from '@snow-tzu/config-remote';

const source = new AWSParameterStoreSource({
  path: '/myapp/production',
  region: 'us-east-1',
  recursive: true,
  decryptSecrets: true,
  priority: 300
});

// Use with any framework
const config = await createSpringConfig({
  additionalSources: [source],
  configClasses: [DatabaseConfig]
});
```

**AWS Parameter Structure:**

```
/myapp/production/database/host = "prod-db.example.com"
/myapp/production/database/port = "5432"
/myapp/production/server/port = "8080"
```

Maps to:

```yaml
database:
  host: prod-db.example.com
  port: 5432
server:
  port: 8080
```

### Consul Example

```typescript
import { ConsulSource } from '@snow-tzu/config-remote';

const source = new ConsulSource({
  prefix: 'myapp/production',
  host: 'consul.example.com',
  port: 8500,
  secure: true,
  token: process.env.CONSUL_TOKEN,
  format: 'json',
  priority: 300
});
```

### etcd Example

```typescript
import { EtcdSource } from '@snow-tzu/config-remote';

const source = new EtcdSource({
  prefix: '/myapp/production',
  hosts: ['etcd1.example.com:2379', 'etcd2.example.com:2379'],
  credentials: {
    rootCertificate: fs.readFileSync('./ca.crt'),
    privateKey: fs.readFileSync('./client.key'),
    certChain: fs.readFileSync('./client.crt')
  },
  auth: {
    username: 'myapp',
    password: process.env.ETCD_PASSWORD
  },
  priority: 300
});
```

## Who is this for?

- Node.js/TypeScript developers who want type-safe, robust, and maintainable remote configuration
- Teams needing to merge are cloud, local, and environment config
- Projects needing secure, profile-based, or encrypted config

## Comparison

| Feature          | type-config/remote | aws-parameter-store | consul | etcd | node-config |
|------------------|:------------------:|:-------------------:|:------:|:----:|:-----------:|
| Type safety      |  ✅ Decorators, TS  |          ❌          |   ❌    |  ❌   |      ❌      |
| Multi-source     |   ✅ Remote+local   |          ❌          |   ❌    |  ❌   |      ✅      |
| Profile support  |   ✅ Spring-style   |          ❌          |   ❌    |  ❌   |      ✅      |
| Hot reload       |     ✅ Built-in     |          ❌          |   ❌    |  ❌   |      ❌      |
| Encryption       |     ✅ Built-in     |          ❌          |   ❌    |  ❌   |      ❌      |
| Validation       | ✅ class-validator  |          ❌          |   ❌    |  ❌   |      ❌      |
| Priority merging |       ✅ Yes        |          ❌          |   ❌    |  ❌   |  ⚠️ Manual  |

## License

MIT © Ganesan Arunachalam
