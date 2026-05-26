import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(requestingUser: any) {
    if (requestingUser.role === Role.SUPERADMIN) {
      return this.prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          role: true,
          dinasId: true,
          dinas: { select: { id: true, name: true, code: true } },
          isEmailVerified: true,
          photoUrl: true,
          createdAt: true,
        },
        orderBy: { fullName: 'asc' },
      });
    } else if (requestingUser.role === Role.ADMIN) {
      if (!requestingUser.dinasId) {
        throw new ForbiddenException('Admin user is not associated with any Dinas');
      }
      return this.prisma.user.findMany({
        where: { dinasId: requestingUser.dinasId },
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          role: true,
          dinasId: true,
          dinas: { select: { id: true, name: true, code: true } },
          isEmailVerified: true,
          photoUrl: true,
          createdAt: true,
        },
        orderBy: { fullName: 'asc' },
      });
    } else {
      throw new ForbiddenException('You do not have permission to access user directory');
    }
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        dinasId: true,
        dinas: { select: { id: true, name: true, code: true } },
        isEmailVerified: true,
        photoUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, requestingUser: any) {
    // 1. Verify user exists
    const user = await this.findOne(id);

    // 2. Check permissions: Superadmin OR the user themselves
    if (requestingUser.role !== Role.SUPERADMIN && requestingUser.id !== id) {
      throw new ForbiddenException('You do not have permission to update this profile');
    }

    const { username, email, fullName, dinasId, photoUrl } = updateUserDto;

    // 3. Validate unique email
    if (email && email !== user.email) {
      const existingEmail = await this.prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        throw new ConflictException('Email already registered');
      }
    }

    // 4. Validate unique username
    if (username && username !== user.username) {
      const existingUsername = await this.prisma.user.findUnique({ where: { username } });
      if (existingUsername) {
        throw new ConflictException('Username already taken');
      }
    }

    // 5. Validate dinasId
    if (dinasId && dinasId !== user.dinasId) {
      const dinasExists = await this.prisma.dinas.findUnique({ where: { id: dinasId } });
      if (!dinasExists) {
        throw new NotFoundException('Dinas not found');
      }
    }

    // 6. Perform update
    return this.prisma.user.update({
      where: { id },
      data: {
        username,
        email,
        fullName,
        dinasId,
        photoUrl,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        dinasId: true,
        isEmailVerified: true,
        photoUrl: true,
        updatedAt: true,
      },
    });
  }

  async updateRole(id: string, role: Role, requestingUser: any) {
    // 1. Verify user exists
    await this.findOne(id);

    // 2. Self role modification protection
    if (requestingUser.id === id) {
      throw new BadRequestException('You cannot modify your own role');
    }

    // 3. Update role
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        updatedAt: true,
      },
    });
  }

  async updatePhoto(id: string, photoUrl: string, requestingUser: any) {
    // 1. Verify user exists
    await this.findOne(id);

    // 2. Check permissions
    if (requestingUser.role !== Role.SUPERADMIN && requestingUser.id !== id) {
      throw new ForbiddenException('You do not have permission to update this profile picture');
    }

    // 3. Update photo
    return this.prisma.user.update({
      where: { id },
      data: { photoUrl },
      select: {
        id: true,
        fullName: true,
        photoUrl: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: string, requestingUser: any) {
    // 1. Verify user exists
    const user = await this.findOne(id);

    // 2. Self deletion protection
    if (requestingUser.id === id) {
      throw new BadRequestException('You cannot delete your own account');
    }

    // 3. Prevent deleting the last SUPERADMIN
    if (user.role === Role.SUPERADMIN) {
      const superadminsCount = await this.prisma.user.count({
        where: { role: Role.SUPERADMIN },
      });
      if (superadminsCount <= 1) {
        throw new BadRequestException('Cannot delete the only remaining Superadmin in the system');
      }
    }

    // 4. Delete user (Cascade will handle activities if defined, or we can check. In schema, activity has user relation. Let's make sure it doesn't break. If it does, we can block or delete activities first).
    const activitiesCount = await this.prisma.activity.count({
      where: { userId: id },
    });
    if (activitiesCount > 0) {
      // Clean up activities first or block deletion
      throw new BadRequestException(`Cannot delete user because they have ${activitiesCount} associated activity records. Delete activities first.`);
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'User account deleted successfully' };
  }
}
