import {
  ConfigurationProperties,
  ConfigProperty,
  Required,
  DefaultValue,
} from '@snow-tzu/type-config-nestjs';

/**
 * Server configuration with placeholder resolution
 * Demonstrates environment variable placeholders with fallback values
 */
@ConfigurationProperties('server')
export class ServerConfig {
  @ConfigProperty()
  @Required()
  host: string;

  @ConfigProperty()
  @DefaultValue(3000)
  port: number = 3000;

  @ConfigProperty()
  @Required()
  name: string;
}
