import { Controller, Get, Patch, Delete, Body, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Request() req) {
    return this.usersService.findAll(req.user);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req) {
    return this.usersService.update(id, updateUserDto, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  @Patch(':id/role')
  @HttpCode(HttpStatus.OK)
  async updateRole(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto, @Request() req) {
    return this.usersService.updateRole(id, updateRoleDto.role, req.user);
  }

  @Patch(':id/photo')
  @HttpCode(HttpStatus.OK)
  async updatePhoto(@Param('id') id: string, @Body('photoUrl') photoUrl: string, @Request() req) {
    return this.usersService.updatePhoto(id, photoUrl, req.user);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @Request() req) {
    return this.usersService.remove(id, req.user);
  }
}
