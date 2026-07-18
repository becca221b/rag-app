import { IsOptional, IsString, Length } from 'class-validator';

export class ChatQueryDto {
  @IsString()
  @Length(1, 1000)
  query: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
