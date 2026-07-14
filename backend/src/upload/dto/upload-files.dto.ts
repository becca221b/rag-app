import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsString, Matches, ValidateNested } from 'class-validator';

export class UploadFilesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UploadFileItemDto)
  files: UploadFileItemDto[];
}

export class UploadFileItemDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\.pdf$/i, {
    message: 'Only PDF files are allowed',
  })
  filename: string;
}
