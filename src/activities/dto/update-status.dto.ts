import { IsEnum, IsNotEmpty } from 'class-validator';
import { Status } from '@prisma/client';

export class UpdateStatusDto {
  @IsEnum(Status)
  @IsNotEmpty()
  status: Status;
}
