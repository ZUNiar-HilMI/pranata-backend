import { Controller, Get, Put, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get('budget-limit')
  @HttpCode(HttpStatus.OK)
  async getBudgetLimit() {
    return this.settingsService.getBudgetLimit();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  @Put('budget-limit')
  @HttpCode(HttpStatus.OK)
  async updateBudgetLimit(@Body() updateSettingDto: UpdateSettingDto) {
    return this.settingsService.updateBudgetLimit(updateSettingDto.value);
  }
}
