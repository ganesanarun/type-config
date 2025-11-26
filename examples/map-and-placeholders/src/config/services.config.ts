import {
  ConfigurationProperties,
  ConfigProperty,
  Required,
} from '@snow-tzu/type-config-nestjs';

/**
 * Service endpoint configuration
 */
export class ServiceEndpoint {
  url: string;
  timeout: number;
  retries: number;
}

/**
 * Services configuration with Map-based endpoints
 * Demonstrates map-based configuration for service discovery
 */
@ConfigurationProperties('services')
export class ServicesConfig {
  /**
   * Map of service endpoints by service name
   * This demonstrates the Map<string, T> binding feature for service endpoints
   */
  @ConfigProperty('endpoints')
  @Required()
  endpoints: Map<string, ServiceEndpoint>;

  /**
   * Helper method to get a specific service endpoint
   */
  getEndpoint(serviceName: string): ServiceEndpoint | undefined {
    return this.endpoints.get(serviceName);
  }

  /**
   * Helper method to list all available services
   */
  getServiceNames(): string[] {
    return Array.from(this.endpoints.keys());
  }
}
