import {
  ConfigurationProperties,
  ConfigProperty,
  DefaultValue,
} from '@snow-tzu/type-config-nestjs';

/**
 * Feature flags configuration with placeholder resolution
 * Demonstrates boolean placeholders with fallback values
 */
@ConfigurationProperties('features')
export class FeaturesConfig {
  @ConfigProperty()
  @DefaultValue(false)
  enableNewUI: boolean = false;

  @ConfigProperty()
  @DefaultValue(false)
  enableBetaFeatures: boolean = false;

  @ConfigProperty()
  @DefaultValue(false)
  maintenanceMode: boolean = false;
}
