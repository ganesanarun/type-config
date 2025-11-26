import { DefaultValue, Validate } from '@snow-tzu/type-config-nestjs';
import { IsNumber, Min } from 'class-validator';

/**
 * Database Pool Configuration (Level 2 nesting)
 * Demonstrates @DefaultValue with validation decorators
 */
@Validate()
export class PoolConfig {
  @DefaultValue(10)
  @IsNumber()
  @Min(1)
  maxConnections!: number;

  @DefaultValue(1)
  @IsNumber()
  @Min(1)
  minConnections!: number;
}
