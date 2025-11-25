import { ConfigurationProperties, ConfigProperty } from '@snow-tzu/type-config-nestjs';

@ConfigurationProperties('server')
export class ServerConfig {
  @ConfigProperty()
  port: number = 3000;

  @ConfigProperty()
  host: string = 'localhost';
}
