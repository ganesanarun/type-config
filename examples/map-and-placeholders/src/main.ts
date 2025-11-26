import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CONFIG_MANAGER_TOKEN, ConfigManager } from '@snow-tzu/type-config-nestjs';
import { ServerConfig } from './config/server.config';
import { ServicesConfig } from './config/services.config';
import { FeaturesConfig } from './config/features.config';
import { DatabasesRecordConfig, DatabaseConnectionValidated } from './config/database-record.config';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    // Get ConfigManager from the DI container
    const configManager = app.get<ConfigManager>(CONFIG_MANAGER_TOKEN);

    // Bind all configuration classes
    const serverConfig = configManager.bind(ServerConfig);
    const databasesConfig = configManager.bind(DatabasesRecordConfig);
    const servicesConfig = configManager.bind(ServicesConfig);
    const featuresConfig = configManager.bind(FeaturesConfig);

    // Optional: Manual validation for Map entries
    // Since class-validator doesn't support Map validation, you can add custom checks
    console.log('\n--- Validating Configuration ---');
    console.log('Connections type:', typeof databasesConfig.connections);
    console.log('Is Map?', databasesConfig.connections instanceof Map);
    console.log('Connections:', databasesConfig.connections);

    let validationErrors = 0;

    // Check if connections is actually a Map
    if (!(databasesConfig.connections instanceof Map)) {
      console.log('⚠️  Warning: connections is not a Map, converting...');
      // If it's a plain object, convert to Map for iteration
      const entries: [string, DatabaseConnectionValidated][] = Object.entries(databasesConfig.connections);
      for (const [name, conn] of entries) {
        const missing: string[] = [];
        if (!conn.host) {
          missing.push('host');
        }
        if (!conn.port) {
          missing.push('port');
        }
        if (!conn.username) {
          missing.push('username');
        }
        if (!conn.password) {
          missing.push('password');
        }
        if (!conn.database) {
          missing.push('database');
        }
        if (!conn.schema) {
          missing.push('schema');
        }
        if (conn.ssl === undefined) {
          missing.push('ssl');
        }

        if (missing.length > 0) {
          console.log(`  ⚠️  Database '${name}' missing fields: ${missing.join(', ')}`);
          validationErrors++;
        }
      }
    } else {
      for (const [name, conn] of databasesConfig.connections) {
        const missing: string[] = [];
        if (!conn.host) {
          missing.push('host');
        }
        if (!conn.port) {
          missing.push('port');
        }
        if (!conn.username) {
          missing.push('username');
        }
        if (!conn.password) {
          missing.push('password');
        }
        if (!conn.database) {
          missing.push('database');
        }
        if (!conn.schema) {
          missing.push('schema');
        }
        if (conn.ssl === undefined) {
          missing.push('ssl');
        }

        if (missing.length > 0) {
          console.log(`  ⚠️  Database '${name}' missing fields: ${missing.join(', ')}`);
          validationErrors++;
        }
      }

      if (validationErrors > 0) {
        console.log(`\n⚠️  Found ${validationErrors} validation issue(s) in database connections`);
        console.log('Note: This example has validateOnBind: false, so these are warnings only.\n');
      } else {
        console.log('  ✅ All database connections have required fields\n');
      }
    }

    // Display configuration information
    console.log('\n=== Map and Placeholders Example ===\n');
    console.log(`🚀 Server: ${serverConfig.name}`);
    console.log(`📝 Profile: ${configManager.getProfile()}`);
    console.log(`🌐 Host: ${serverConfig.host}:${serverConfig.port}`);

    console.log('\n--- Database Connections (Map-based) ---');
    const connectionNames = databasesConfig.getConnectionNames();
    connectionNames.forEach(name => {
      const conn = databasesConfig.getConnection(name);
      console.log(`  📊 ${name}:`);
      console.log(`     Host: ${conn.host}:${conn.port}`);
      console.log(`     Database: ${conn.database} (schema: ${conn.schema})`);
      console.log(`     Username: ${conn.username}`);
      console.log(`     SSL: ${conn.ssl}`);
    });

    console.log('\n--- Connection Pool Settings ---');
    console.log(`  Min: ${databasesConfig.pool.min}`);
    console.log(`  Max: ${databasesConfig.pool.max}`);
    console.log(`  Idle: ${databasesConfig.pool.idle}ms`);

    console.log('\n--- Service Endpoints (Map-based) ---');
    const serviceNames = servicesConfig.getServiceNames();
    serviceNames.forEach(name => {
      const endpoint = servicesConfig.getEndpoint(name);
      console.log(`  🔗 ${name}:`);
      console.log(`     URL: ${endpoint.url}`);
      console.log(`     Timeout: ${endpoint.timeout}ms`);
      console.log(`     Retries: ${endpoint.retries}`);
    });

    console.log('\n--- Feature Flags (Placeholder-based) ---');
    console.log(`  🎨 New UI: ${featuresConfig.enableNewUI}`);
    console.log(`  🧪 Beta Features: ${featuresConfig.enableBetaFeatures}`);
    console.log(`  🔧 Maintenance Mode: ${featuresConfig.maintenanceMode}`);

    console.log('\n--- Placeholder Resolution Examples ---');
    console.log('This example demonstrates:');
    console.log('  ✓ ${VAR:fallback} syntax with fallback values');
    console.log('  ✓ Profile-specific placeholder overrides');
    console.log('  ✓ Map<string, T> binding for collections');
    console.log('  ✓ Nested object structures in maps');
    console.log('  ✓ Underscore-based ENV resolution (e.g., DATABASES_POOL_MIN)');

    console.log('\n--- API Endpoints ---');
    console.log(`  GET http://${serverConfig.host}:${serverConfig.port}/config`);
    console.log(`  GET http://${serverConfig.host}:${serverConfig.port}/database/:name`);
    console.log(`  GET http://${serverConfig.host}:${serverConfig.port}/service/:name`);

    // Register onChange listener
    configManager.onChange(_newConfig => {
      console.log('\n⚡ Configuration reloaded');
    });

    // Start the application
    await app.listen(serverConfig.port, serverConfig.host);

    console.log(`\n✅ Application started successfully\n`);
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

bootstrap();
