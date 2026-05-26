import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

interface OtpData {
  otp: string;
  timestamp: Date;
  attempts: number;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private otpStore = new Map<string, OtpData>();
  private readonly otpExpiryMinutes = 5;
  private readonly maxAttempts = 3;

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOtp(sendOtpDto: SendOtpDto) {
    const { email, username } = sendOtpDto;
    const otp = this.generateOtp();

    // 1. Store OTP
    this.otpStore.set(email, {
      otp,
      timestamp: new Date(),
      attempts: 0,
    });

    const serviceId = process.env.EMAILJS_SERVICE_ID;
    const templateId = process.env.EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.EMAILJS_PUBLIC_KEY;

    const isEmailConfigured = serviceId && templateId && publicKey;

    if (!isEmailConfigured) {
      this.logger.warn(`⚠️ [DEMO MODE] EmailJS is not configured. OTP for ${email} is: ${otp}`);
      return {
        success: true,
        message: 'OTP generated in demo mode.',
        demoOtp: otp, // Return in response for development ease
        demoMode: true,
      };
    }

    try {
      // 2. Send via EmailJS API
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: {
            email: email,
            to_email: email, // Pastikan to_email juga dikirim untuk kompatibilitas template
            to_name: username,
            user_name: username,
            otp_code: otp,
            from_name: 'SIGAP PRANATA',
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`EmailJS responded with status ${response.status}: ${errText}`);
      }

      this.logger.log(`✅ OTP email sent successfully to ${email}`);
      return {
        success: true,
        message: `OTP sent to ${email}`,
        demoMode: false,
      };
    } catch (error) {
      this.logger.error(`⚠️ EmailJS failed to send email: ${error.message}`);
      this.logger.warn(`📱 Falling back to DEMO MODE. OTP for ${email} is: ${otp}`);
      return {
        success: true,
        message: `OTP sent to ${email} (Demo Mode fallback)`,
        demoOtp: otp,
        demoMode: true,
      };
    }
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { email, otp } = verifyOtpDto;
    const storedData = this.otpStore.get(email);

    if (!storedData) {
      throw new BadRequestException('No OTP found. Please request a new one.');
    }

    const { otp: storedOtp, timestamp, attempts } = storedData;

    // 1. Check expiry
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 1000 / 60);

    if (diffMins >= this.otpExpiryMinutes) {
      this.otpStore.delete(email);
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    // 2. Check failed attempts
    if (attempts >= this.maxAttempts) {
      this.otpStore.delete(email);
      throw new BadRequestException('Too many failed attempts. Please request a new OTP.');
    }

    // 3. Verify
    if (storedOtp === otp) {
      this.otpStore.delete(email);
      return {
        success: true,
        message: 'OTP verified successfully!',
      };
    } else {
      // Increment attempts
      this.otpStore.set(email, {
        ...storedData,
        attempts: attempts + 1,
      });
      throw new BadRequestException('Invalid OTP. Please try again.');
    }
  }
}
