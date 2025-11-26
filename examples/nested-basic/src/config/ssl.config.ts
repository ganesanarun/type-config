import { DefaultValue, Validate } from '@snow-tzu/type-config-nestjs';
import { IsBoolean, IsString } from 'class-validator';

/**
 * SSL Configuration (Level 2 nesting)
 * Demonstrates @DefaultValue on nested class properties
 */
@Validate()
export class SslConfig {
  @DefaultValue(false)
  @IsBoolean()
  enabled!: boolean;

  @DefaultValue('./certs/cert.pem')
  @IsString()
  certPath!: string;
}
