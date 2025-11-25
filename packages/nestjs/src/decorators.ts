import { Inject } from '@nestjs/common';
import { CONFIG_MANAGER_TOKEN } from './type-config.module';

/**
 * Decorator to inject ConfigManager into NestJS services/controllers
 */
export const InjectConfigManager = () => Inject(CONFIG_MANAGER_TOKEN);

/**
 * Re-export core decorators for convenience
 */
export {
  ConfigurationProperties,
  ConfigProperty,
  Required,
  DefaultValue,
  Validate,
} from '@snow-tzu/type-config';
