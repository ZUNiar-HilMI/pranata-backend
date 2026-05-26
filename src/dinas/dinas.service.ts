import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDinasDto } from './dto/create-dinas.dto';
import { UpdateDinasDto } from './dto/update-dinas.dto';

@Injectable()
export class DinasService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.dinas.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const dinas = await this.prisma.dinas.findUnique({
      where: { id },
    });
    if (!dinas) {
      throw new NotFoundException(`Dinas with ID "${id}" not found`);
    }
    return dinas;
  }

  async create(createDinasDto: CreateDinasDto) {
    const { name, code, description } = createDinasDto;
    const uppercaseCode = code.toUpperCase();

    // 1. Check if code already exists
    const existingDinas = await this.prisma.dinas.findUnique({
      where: { code: uppercaseCode },
    });
    if (existingDinas) {
      throw new ConflictException(`Dinas with code "${uppercaseCode}" already exists`);
    }

    // 2. Create Dinas
    return this.prisma.dinas.create({
      data: {
        name,
        code: uppercaseCode,
        description: description ?? '',
      },
    });
  }

  async update(id: string, updateDinasDto: UpdateDinasDto) {
    const { name, code, description } = updateDinasDto;

    // 1. Verify Dinas exists
    await this.findOne(id);

    // 2. If code is being updated, verify it is unique
    if (code) {
      const uppercaseCode = code.toUpperCase();
      const existingDinas = await this.prisma.dinas.findFirst({
        where: {
          code: uppercaseCode,
          NOT: { id },
        },
      });
      if (existingDinas) {
        throw new ConflictException(`Dinas with code "${uppercaseCode}" already exists`);
      }
      updateDinasDto.code = uppercaseCode;
    }

    // 3. Update Dinas
    return this.prisma.dinas.update({
      where: { id },
      data: {
        name,
        code: updateDinasDto.code,
        description,
      },
    });
  }

  async remove(id: string) {
    // 1. Verify Dinas exists
    await this.findOne(id);

    // 2. Check for related users
    const usersCount = await this.prisma.user.count({
      where: { dinasId: id },
    });
    if (usersCount > 0) {
      throw new BadRequestException(`Cannot delete Dinas with ID "${id}" because it has ${usersCount} associated user(s)`);
    }

    // 3. Check for related activities
    const activitiesCount = await this.prisma.activity.count({
      where: { dinasId: id },
    });
    if (activitiesCount > 0) {
      throw new BadRequestException(`Cannot delete Dinas with ID "${id}" because it has ${activitiesCount} associated activity/activities`);
    }

    // 4. Delete Dinas
    await this.prisma.dinas.delete({
      where: { id },
    });

    return { message: 'Dinas deleted successfully' };
  }
}
