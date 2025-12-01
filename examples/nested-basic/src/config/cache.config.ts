import { Required, DefaultValue, ConfigProperty, Validate } from '@snow-tzu/type-config-nestjs';
import { IsString, IsNumber, Min, Max } from 'class-validator';

/**
 * Cache Service Configuration
 * Demonstrates:
 * - Mix of @Required and @DefaultValue
 * - @Validate() for validation
 */
@Validate()
export class CacheConfig {
  @ConfigProperty()
  @Required()
  @IsString()
  @DefaultValue('localhost')
  host!: string;

  @ConfigProperty()
  @DefaultValue(6379)
  @IsNumber()
  @Min(1)
  @Max(65535)
  port!: number;

  @ConfigProperty()
  @DefaultValue(3600)
  @IsNumber()
  @Min(60)
  ttl!: number;
}
