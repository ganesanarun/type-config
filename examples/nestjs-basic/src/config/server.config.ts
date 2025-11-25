import { ConfigurationProperties, ConfigProperty, DefaultValue } from '@snow-tzu/type-config-nestjs';

@ConfigurationProperties('server')
export class ServerConfig {
  @ConfigProperty()
  @DefaultValue(3000)
  port: number = 3000;

  @ConfigProperty()
  @DefaultValue('localhost')
  host: string = 'localhost';
}
