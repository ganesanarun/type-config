import { Injectable, Inject } from '@nestjs/common';
import { ConfigManager, CONFIG_MANAGER_TOKEN } from '@snow-tzu/type-config-nestjs';
import { DatabasesConfig } from './config/database.config';
import { ServicesConfig } from './config/services.config';
import { FeaturesConfig } from './config/features.config';

@Injectable()
export class AppService {
  private databasesConfig: DatabasesConfig;
  private servicesConfig: ServicesConfig;
  private featuresConfig: FeaturesConfig;

  constructor(
    @Inject(CONFIG_MANAGER_TOKEN) private configManager: ConfigManager,
  ) {
    // Bind configuration classes
    this.databasesConfig = this.configManager.bind(DatabasesConfig);
    this.servicesConfig = this.configManager.bind(ServicesConfig);
    this.featuresConfig = this.configManager.bind(FeaturesConfig);
  }

  getConfigInfo(): any {
    return {
      profile: this.configManager.getProfile(),
      databases: {
        connectionNames: this.databasesConfig.getConnectionNames(),
        connections: Object.fromEntries(this.databasesConfig.connections),
        pool: this.databasesConfig.pool,
      },
      services: {
        serviceNames: this.servicesConfig.getServiceNames(),
        endpoints: Object.fromEntries(this.servicesConfig.endpoints),
      },
      features: {
        enableNewUI: this.featuresConfig.enableNewUI,
        enableBetaFeatures: this.featuresConfig.enableBetaFeatures,
        maintenanceMode: this.featuresConfig.maintenanceMode,
      },
    };
  }

  getDatabaseConnection(name: string): any {
    const connection = this.databasesConfig.getConnection(name);
    if (!connection) {
      return { error: `Database connection '${name}' not found` };
    }
    return {
      name,
      ...connection,
      // Mask password for security
      password: '***',
    };
  }

  getServiceEndpoint(name: string): any {
    const endpoint = this.servicesConfig.getEndpoint(name);
    if (!endpoint) {
      return { error: `Service endpoint '${name}' not found` };
    }
    return {
      name,
      ...endpoint,
    };
  }
}
