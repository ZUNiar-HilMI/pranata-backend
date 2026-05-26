import { Module } from '@nestjs/common';
import { DinasService } from './dinas.service';
import { DinasController } from './dinas.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DinasController],
  providers: [DinasService],
  exports: [DinasService],
})
export class DinasModule {}
