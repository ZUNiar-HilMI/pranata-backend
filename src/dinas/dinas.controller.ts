import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { DinasService } from './dinas.service';
import { CreateDinasDto } from './dto/create-dinas.dto';
import { UpdateDinasDto } from './dto/update-dinas.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('dinas')
export class DinasController {
  constructor(private dinasService: DinasService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll() {
    return this.dinasService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.dinasService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDinasDto: CreateDinasDto) {
    return this.dinasService.create(createDinasDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() updateDinasDto: UpdateDinasDto) {
    return this.dinasService.update(id, updateDinasDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.dinasService.remove(id);
  }
}
