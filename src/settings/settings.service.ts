import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getBudgetLimit() {
    const setting = await this.prisma.setting.findUnique({
      where: { key: 'budget_limit' },
    });
    
    // Return default 1 Billion if setting doesn't exist
    return {
      key: 'budget_limit',
      value: setting ? setting.value : '1000000000',
    };
  }

  async updateBudgetLimit(value: string) {
    const setting = await this.prisma.setting.upsert({
      where: { key: 'budget_limit' },
      update: { value },
      create: {
        key: 'budget_limit',
        value,
      },
    });

    return setting;
  }
}
