import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private isConfigured = false;

  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.isConfigured = true;
      this.logger.log('✅ Cloudinary initialized successfully');
    } else {
      this.logger.warn('⚠️ Cloudinary credentials missing in .env. Falling back to Demo Mode.');
    }
  }

  async uploadFile(file: Express.Multer.File, folder = 'pranata'): Promise<any> {
    if (!file) {
      throw new BadRequestException('No file provided for upload');
    }

    if (!this.isConfigured) {
      this.logger.warn(`📱 [DEMO MODE] Mocking file upload for: ${file.originalname}`);
      
      // Return a beautiful mock placeholder image that fits
      const randomId = Math.floor(Math.random() * 1000);
      return {
        secure_url: `https://picsum.photos/id/${randomId % 200}/800/600`,
        public_id: `demo_${Date.now()}`,
        demo_mode: true,
      };
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            this.logger.error(`❌ Cloudinary upload failed: ${error.message}`);
            return reject(new BadRequestException(`Cloudinary upload failed: ${error.message}`));
          }
          resolve(result);
        },
      );

      uploadStream.end(file.buffer);
    });
  }
}
