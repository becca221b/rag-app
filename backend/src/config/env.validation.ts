import { plainToInstance, Transform } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsBoolean, IsNotEmpty, validateSync } from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsOptional()
  @IsNumber()
  PORT?: number;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN?: string;

  @IsString()
  @IsNotEmpty()
  AWS_REGION: string;

  @IsString()
  @IsNotEmpty()
  AWS_ACCESS_KEY_ID: string;

  @IsString()
  @IsNotEmpty()
  AWS_SECRET_ACCESS_KEY: string;

  @IsString()
  @IsNotEmpty()
  AWS_S3_BUCKET: string;

  @IsOptional()
  @IsString()
  AWS_BEDROCK_REGION?: string;

  @IsString()
  @IsNotEmpty()
  OPENSEARCH_NODE: string;

  @IsString()
  @IsNotEmpty()
  OPENSEARCH_USERNAME: string;

  @IsString()
  @IsNotEmpty()
  OPENSEARCH_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  OPENSEARCH_INDEX: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() !== 'false';
    }
    return value;
  })
  @IsBoolean()
  OPENSEARCH_REJECT_UNAUTHORIZED?: boolean;

  @IsOptional()
  @IsNumber()
  EMBEDDING_DIMENSION?: number;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
