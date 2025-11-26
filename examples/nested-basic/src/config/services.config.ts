import { ConfigProperty, Validate } from '@snow-tzu/type-config-nestjs';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiConfig } from './api.config';
import { CacheConfig } from './cache.config';

/**
 * Services Configuration (Level 1 nesting)
 * Demonstrates multiple nested classes at the same level
 */
@Validate()
export class ServicesConfig {
  // Multiple nested classes
  // When using @Validate() on parent class, nested classes need @ValidateNested() and @Type()
  @ConfigProperty('api')
  @ValidateNested()
  @Type(() => ApiConfig)
  api!: ApiConfig;
  
  @ConfigProperty('cache')
  @ValidateNested()
  @Type(() => CacheConfig)
  cache!: CacheConfig;
}
