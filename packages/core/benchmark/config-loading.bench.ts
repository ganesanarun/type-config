import 'reflect-metadata';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { ConfigurationBuilder, ConfigurationProperties, ConfigProperty, DefaultValue } from '../src';
import { benchmark, formatResults } from './utils';

const TEMP_DIR = join(__dirname, '.tmp');

@ConfigurationProperties('server')
class ServerConfig {
  @ConfigProperty()
  @DefaultValue('localhost')
  host!: string;

  @ConfigProperty()
  @DefaultValue(3000)
  port!: number;

  @ConfigProperty()
  @DefaultValue(false)
  ssl!: boolean;
}

@ConfigurationProperties('database')
class DatabaseConfig {
  @ConfigProperty()
  @DefaultValue('localhost')
  host!: string;

  @ConfigProperty()
  @DefaultValue(5432)
  port!: number;

  @ConfigProperty()
  @DefaultValue('postgres')
  username!: string;

  @ConfigProperty()
  @DefaultValue('')
  password!: string;

  @ConfigProperty()
  @DefaultValue('myapp')
  database!: string;
}

function setupTestConfig(size: 'small' | 'medium' | 'large') {
  rmSync(TEMP_DIR, { recursive: true, force: true });
  mkdirSync(TEMP_DIR, { recursive: true });

  const config: any = {
    server: {
      host: 'example.com',
      port: 8080,
      ssl: true,
    },
    database: {
      host: 'db.example.com',
      port: 5432,
      username: 'admin',
      password: 'secret123',
      database: 'production',
    },
  };

  // Add extra properties based on size
  if (size === 'medium' || size === 'large') {
    for (let i = 0; i < 50; i++) {
      config[`section${i}`] = {
        value1: `value${i}`,
        value2: i,
        nested: {
          prop1: `nested${i}`,
          prop2: i * 2,
        },
      };
    }
  }

  if (size === 'large') {
    for (let i = 50; i < 200; i++) {
      config[`section${i}`] = {
        value1: `value${i}`,
        value2: i,
        nested: {
          prop1: `nested${i}`,
          prop2: i * 2,
          deep: {
            prop1: `deep${i}`,
            prop2: i * 3,
          },
        },
      };
    }
  }

  writeFileSync(
    join(TEMP_DIR, 'application.json'),
    JSON.stringify(config, null, 2)
  );

  writeFileSync(
    join(TEMP_DIR, 'application.yml'),
    `server:
  host: example.com
  port: 8080
  ssl: true

database:
  host: db.example.com
  port: 5432
  username: admin
  password: secret123
  database: production
`
  );

  writeFileSync(
    join(TEMP_DIR, '.env'),
    `SERVER_HOST=localhost
SERVER_PORT=3000
DATABASE_HOST=localhost
DATABASE_PORT=5432
`
  );
}

export async function runBenchmarks() {
  console.log('Starting configuration loading benchmarks...\n');

  const results = [];

  // Benchmark 1: Small config loading (JSON)
  setupTestConfig('small');
  results.push(
    await benchmark(
      'Load small JSON config',
      async () => {
        const { configManager } = await new ConfigurationBuilder()
          .withConfigDir(TEMP_DIR)
          .registerConfig(ServerConfig)
          .registerConfig(DatabaseConfig)
          .build();
        configManager.get('server.host');
      },
      { warmupIterations: 10, iterations: 100, minTime: 1000 }
    )
  );

  // Benchmark 2: Medium config loading (JSON)
  setupTestConfig('medium');
  results.push(
    await benchmark(
      'Load medium JSON config (50 sections)',
      async () => {
        const { configManager } = await new ConfigurationBuilder()
          .withConfigDir(TEMP_DIR)
          .registerConfig(ServerConfig)
          .registerConfig(DatabaseConfig)
          .build();
        configManager.get('server.host');
      },
      { warmupIterations: 10, iterations: 50, minTime: 1000 }
    )
  );

  // Benchmark 3: Large config loading (JSON)
  setupTestConfig('large');
  results.push(
    await benchmark(
      'Load large JSON config (200 sections)',
      async () => {
        const { configManager } = await new ConfigurationBuilder()
          .withConfigDir(TEMP_DIR)
          .registerConfig(ServerConfig)
          .registerConfig(DatabaseConfig)
          .build();
        configManager.get('server.host');
      },
      { warmupIterations: 5, iterations: 25, minTime: 1000 }
    )
  );

  // Benchmark 4: Config value retrieval
  setupTestConfig('medium');
  const { configManager } = await new ConfigurationBuilder()
    .withConfigDir(TEMP_DIR)
    .registerConfig(ServerConfig)
    .registerConfig(DatabaseConfig)
    .build();

  results.push(
    await benchmark(
      'Get config value by path',
      () => {
        configManager.get('server.host');
        configManager.get('database.port');
      },
      { iterations: 10000, minTime: 1000 }
    )
  );

  // Benchmark 5: Typed config access via container
  const { container } = await new ConfigurationBuilder()
    .withConfigDir(TEMP_DIR)
    .registerConfig(ServerConfig)
    .registerConfig(DatabaseConfig)
    .build();

  results.push(
    await benchmark(
      'Get typed config from container',
      () => {
        const serverConfig = container.get(ServerConfig);
        const dbConfig = container.get(DatabaseConfig);
        void (serverConfig.host + dbConfig.host);
      },
      { iterations: 10000, minTime: 1000 }
    )
  );

  console.log(formatResults(results));
  return formatResults(results);
}

if (require.main === module) {
  runBenchmarks()
    .then(() => {
      console.log('Benchmarks completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Benchmark failed:', error);
      process.exit(1);
    });
}
