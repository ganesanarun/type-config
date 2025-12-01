import { DefaultValue, ConfigProperty, Validate } from '@snow-tzu/type-config-nestjs';
import { IsUrl, IsNumber, Min, Max } from 'class-validator';

/**
 * API Service Configuration
 * Demonstrates:
 * - @Required with @IsUrl validation
 * - @DefaultValue with range validation
 * - @Validate() for class-validator integration
 */
@Validate()
export class ApiConfig {
  @ConfigProperty()
  @IsUrl()
  @DefaultValue('https://api.example.com')
  endpoint!: string;

  @ConfigProperty()
  @DefaultValue(5000)
  @IsNumber()
  @Min(1000)
  @Max(30000)
  timeout!: number;
}
