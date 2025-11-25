import {
  ConfigurationProperties,
  ConfigProperty,
  Required,
  DefaultValue,
} from '@snow-tzu/type-config-nestjs';

@ConfigurationProperties('database')
export class DatabaseConfig {
  @ConfigProperty()
  @Required()
  host: string;

  @ConfigProperty()
  @DefaultValue(5432)
  port: number;

  @ConfigProperty()
  @Required()
  username: string;

  @ConfigProperty()
  @Required()
  password: string;
}
