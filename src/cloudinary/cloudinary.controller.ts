import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from './cloudinary.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('cloudinary')
export class CloudinaryController {
  constructor(private cloudinaryService: CloudinaryService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    const result = await this.cloudinaryService.uploadFile(file, folder || 'pranata');
    return {
      url: result.secure_url,
      publicId: result.public_id,
      demoMode: result.demo_mode || false,
    };
  }
}
