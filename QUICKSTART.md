# Quick Start Guide

Get started with Type Config in minutes!

## Installation

```bash
# Choose your framework
yarn add @snow-tzu/config/express reflect-metadata    # For Express
yarn add @snow-tzu/config/fastify reflect-metadata    # For Fastify
yarn add @snow-tzu/config/nestjs reflect-metadata     # For NestJS
yarn add @snow-tzu/config/core reflect-metadata       # Core only
```

## 1. Create Configuration Classes

```typescript
import 'reflect-metadata';
import { ConfigurationProperties, ConfigProperty, Required } from '@snow-tzu/type-config';

@ConfigurationProperties('database')
class DatabaseConfig {
  @ConfigProperty() @Required() host: string;
  @ConfigProperty() port: number = 5432;
  @ConfigProperty() username: string;
  @ConfigProperty() password: string;
}
```

## 2. Create Config Files

**config/application.yml**
```yaml
database:
  host: localhost
  port: 5432
  username: dev_user
  password: dev_pass
```

**config/application-production.yml**
```yaml
database:
  host: prod-db.example.com
  username: prod_user
  password: prod_pass
```

## 3. Framework Setup

### Express

```typescript
import express from 'express';
import { createTypeConfig } from '@snow-tzu/type-config-express';

const app = express();

const config = await createTypeConfig({
  profile: 'production',
  configClasses: [DatabaseConfig]
});

app.use(config.middleware());

// Use in routes
app.get('/api', (req, res) => {
  const db = req.container.get(DatabaseConfig);
  res.json({ host: db.host });
});

const serverConfig = config.get(DatabaseConfig);
app.listen(3000);
```

### Fastify

```typescript
import Fastify from 'fastify';
import { fastifyTypeConfig } from '@snow-tzu/type-config-fastify';

const fastify = Fastify();

await fastify.register(fastifyTypeConfig, {
  profile: 'production',
  configClasses: [DatabaseConfig]
});

fastify.get('/api', async (request, reply) => {
  const db = request.container.get(DatabaseConfig);
  return { host: db.host };
});

await fastify.listen({ port: 3000 });
```

### NestJS

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TypeConfigModule } from '@snow-tzu/type-config-nestjs';

@Module({
  imports: [
    TypeConfigModule.forRoot({
      profile: 'production',
      isGlobal: true
    }),
    TypeConfigModule.forFeature([DatabaseConfig])
  ]
})
export class AppModule {}

// my.service.ts
@Injectable()
export class MyService {
  constructor(private readonly dbConfig: DatabaseConfig) {}
  
  connect() {
    console.log(`Connecting to ${this.dbConfig.host}`);
  }
}
```

## Advanced Features

### Hot Reload

```typescript
const config = await createTypeConfig({
  enableHotReload: true,
  configClasses: [DatabaseConfig]
});

config.onChange((newConfig) => {
  console.log('Config reloaded!');
});
```

### Encryption

```typescript
import { EncryptionHelper } from '@snow-tzu/config/core';

// Encrypt a value
const enc = new EncryptionHelper('your-32-character-secret-key!!');
const encrypted = enc.encrypt('my-secret-password');
// Output: ENC(iv:encrypted-value)

// Use in config
const config = await createTypeConfig({
  encryptionKey: 'your-32-character-secret-key!!',
  configClasses: [DatabaseConfig]
});
```

### Validation

```typescript
import { IsUrl, Min, Max } from 'class-validator';

@ConfigurationProperties('api')
@Validate()
class ApiConfig {
  @ConfigProperty() @IsUrl() baseUrl: string;
  @ConfigProperty() @Min(1000) @Max(30000) timeout: number;
}
```

### Remote Sources

```typescript
import { AWSParameterStoreSource } from '@snow-tzu/config/remote';

const config = await createTypeConfig({
  additionalSources: [
    new AWSParameterStoreSource({
      path: '/myapp/production',
      region: 'us-east-1'
    })
  ],
  configClasses: [DatabaseConfig]
});
```

## Environment Variables

Environment variables automatically override file configs:

```bash
DATABASE_HOST=my-host DATABASE_PORT=3306 yarn start
```

Maps to:
```yaml
database:
  host: my-host
  port: 3306
```

## Next Steps

- Read the [full documentation](./README.md)
- Check out [examples](./examples/)
- Explore [remote sources](./packages/remote/README.md)
- Learn about [testing](./packages/testing/)

## Need Help?

- GitHub Issues: Report bugs or request features
- Documentation: Each package has detailed README
- Examples: Working examples in `examples/` directory
