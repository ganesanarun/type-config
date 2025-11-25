import {
  ConfigurationProperties,
  ConfigProperty,
  Required,
  DefaultValue,
  Validate,
} from '@snow-tzu/type-config-nestjs';
import { IsString, IsNumber } from 'class-validator';

@ConfigurationProperties('database')
@Validate()
export class DatabaseConfig {
  @ConfigProperty()
  @Required()
  @IsString()
  host: string;

  @ConfigProperty()
  @DefaultValue(5432)
  @IsNumber()
  port: number = 5432;

  @ConfigProperty()
  @IsString()
  username: string;

  @ConfigProperty()
  @IsString()
  password: string;
}
