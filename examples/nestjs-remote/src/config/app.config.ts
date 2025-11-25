import {
  ConfigurationProperties,
  ConfigProperty,
  DefaultValue,
} from '@snow-tzu/type-config-nestjs';

@ConfigurationProperties('app')
export class AppConfig {
  @ConfigProperty()
  @DefaultValue('NestJS App')
  name: string;

  @ConfigProperty()
  @DefaultValue('1.0.0')
  version: string;

  @ConfigProperty()
  environment: string;

  @ConfigProperty()
  features: {
    enableCache: boolean;
    enableMetrics: boolean;
    enableTracing: boolean;
  };
}
