import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { Role, Status } from '@prisma/client';

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  async findAll(requestingUser: any, status?: Status, dinasId?: string) {
    const whereClause: any = {};

    // 1. Enforce Dinas multi-tenancy based on role
    if (requestingUser.role === Role.SUPERADMIN) {
      if (dinasId) {
        whereClause.dinasId = dinasId;
      }
    } else if (requestingUser.role === Role.ADMIN) {
      whereClause.dinasId = requestingUser.dinasId;
    } else {
      // MEMBER can only see their own activities
      whereClause.userId = requestingUser.id;
    }

    // 2. Apply status filter if provided
    if (status) {
      whereClause.status = status;
    }

    return this.prisma.activity.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, username: true, fullName: true, photoUrl: true },
        },
        dinas: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string, requestingUser: any) {
    const activity = await this.prisma.activity.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, username: true, fullName: true, photoUrl: true },
        },
        dinas: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!activity) {
      throw new NotFoundException(`Activity with ID "${id}" not found`);
    }

    // Check permissions
    if (requestingUser.role !== Role.SUPERADMIN) {
      if (requestingUser.role === Role.ADMIN && activity.dinasId !== requestingUser.dinasId) {
        throw new ForbiddenException('You do not have permission to view activities outside your Dinas');
      }
      if (requestingUser.role === Role.MEMBER && activity.userId !== requestingUser.id) {
        throw new ForbiddenException('You do not have permission to view other users\' activities');
      }
    }

    return activity;
  }

  async create(createActivityDto: CreateActivityDto, requestingUser: any) {
    const { name, description, budget, date, location, latitude, longitude, photoBefore, photoAfter } = createActivityDto;

    if (!requestingUser.dinasId) {
      throw new BadRequestException('Your user account is not associated with any Dinas. Cannot create activities.');
    }

    const activityDate = new Date(date);
    const startOfMonth = new Date(activityDate.getFullYear(), activityDate.getMonth(), 1);
    const endOfMonth = new Date(activityDate.getFullYear(), activityDate.getMonth() + 1, 0, 23, 59, 59, 999);

    // 1. Get current monthly approved budget spent for this Dinas
    const approvedActivities = await this.prisma.activity.findMany({
      where: {
        dinasId: requestingUser.dinasId,
        status: Status.APPROVED,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: { budget: true },
    });

    const monthlySpent = approvedActivities.reduce((sum, act) => sum + act.budget, 0);

    // 2. Fetch budget limit
    const limitSetting = await this.prisma.setting.findUnique({
      where: { key: 'budget_limit' },
    });
    const budgetLimit = parseFloat(limitSetting ? limitSetting.value : '1000000000');

    // 3. Check if new budget exceeds limit
    if (monthlySpent + budget > budgetLimit) {
      const formattedLimit = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(budgetLimit);
      const formattedSpent = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(monthlySpent);
      const formattedBudget = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(budget);
      
      throw new BadRequestException(
        `Pengajuan anggaran sebesar ${formattedBudget} ditolak. Total pengeluaran bulan ini (${formattedSpent}) ditambah pengajuan baru melebihi batas limit bulanan Dinas Anda sebesar ${formattedLimit}.`
      );
    }

    // 4. Create activity
    return this.prisma.activity.create({
      data: {
        name,
        description,
        budget,
        date: activityDate,
        location,
        latitude,
        longitude,
        photoBefore,
        photoAfter,
        status: Status.PENDING,
        userId: requestingUser.id,
        dinasId: requestingUser.dinasId,
      },
      include: {
        user: { select: { id: true, fullName: true } },
        dinas: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async update(id: string, updateActivityDto: UpdateActivityDto, requestingUser: any) {
    // 1. Verify activity exists
    const activity = await this.findOne(id, requestingUser);

    // 2. Check permissions: Creator or Superadmin
    if (requestingUser.role !== Role.SUPERADMIN && activity.userId !== requestingUser.id) {
      throw new ForbiddenException('You do not have permission to update this activity');
    }

    // 3. Verify activity is still PENDING
    if (activity.status !== Status.PENDING && requestingUser.role !== Role.SUPERADMIN) {
      throw new BadRequestException('Cannot modify an activity that has already been approved or rejected');
    }

    const { name, description, budget, date, location, latitude, longitude, photoBefore, photoAfter } = updateActivityDto;

    const dataToUpdate: any = {
      name,
      description,
      budget,
      location,
      latitude,
      longitude,
      photoBefore,
      photoAfter,
    };

    if (date) {
      dataToUpdate.date = new Date(date);
    }

    // 4. Update activity
    return this.prisma.activity.update({
      where: { id },
      data: dataToUpdate,
      include: {
        user: { select: { id: true, fullName: true } },
        dinas: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async updateStatus(id: string, status: Status, requestingUser: any) {
    // 1. Verify activity exists
    const activity = await this.findOne(id, requestingUser);

    // 2. Check permissions: Admin of the same Dinas or Superadmin
    if (requestingUser.role !== Role.SUPERADMIN) {
      if (requestingUser.role !== Role.ADMIN || activity.dinasId !== requestingUser.dinasId) {
        throw new ForbiddenException('Only Dinas Admins or Superadmins can approve or reject activities');
      }
    }

    // 3. Update status
    return this.prisma.activity.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        dinas: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async remove(id: string, requestingUser: any) {
    // 1. Verify activity exists
    const activity = await this.findOne(id, requestingUser);

    // 2. Check permissions: Creator (only if PENDING) or Superadmin
    if (requestingUser.role !== Role.SUPERADMIN) {
      if (activity.userId !== requestingUser.id) {
        throw new ForbiddenException('You do not have permission to delete this activity');
      }
      if (activity.status !== Status.PENDING) {
        throw new BadRequestException('Cannot delete an activity that has already been approved or rejected');
      }
    }

    // 3. Delete activity
    await this.prisma.activity.delete({
      where: { id },
    });

    return { message: 'Activity record deleted successfully' };
  }

  async getStatistics(requestingUser: any, year?: number, month?: number) {
    const now = new Date();
    const queryYear = year ?? now.getFullYear();
    const queryMonth = month !== undefined ? month : now.getMonth(); // 0-indexed month

    const startOfMonth = new Date(queryYear, queryMonth, 1);
    const endOfMonth = new Date(queryYear, queryMonth + 1, 0, 23, 59, 59, 999);

    // 1. Determine target Dinas ID
    let targetDinasId: string | null = null;
    if (requestingUser.role !== Role.SUPERADMIN) {
      targetDinasId = requestingUser.dinasId;
      if (!targetDinasId) {
        throw new BadRequestException('User is not associated with any Dinas. Cannot calculate statistics.');
      }
    }

    // 2. Fetch budget limit
    const limitSetting = await this.prisma.setting.findUnique({
      where: { key: 'budget_limit' },
    });
    const budgetLimit = parseFloat(limitSetting ? limitSetting.value : '1000000000');

    // 3. Fetch activities within month range for calculations
    const whereClause: any = {
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    };

    if (targetDinasId) {
      whereClause.dinasId = targetDinasId;
    }

    const activities = await this.prisma.activity.findMany({
      where: whereClause,
      select: { budget: true, status: true },
    });

    // 4. Compute statistics
    const totalCount = activities.length;
    const pendingCount = activities.filter(a => a.status === Status.PENDING).length;
    const approvedCount = activities.filter(a => a.status === Status.APPROVED).length;
    const rejectedCount = activities.filter(a => a.status === Status.REJECTED).length;

    const totalSpent = activities
      .filter(a => a.status === Status.APPROVED)
      .reduce((sum, a) => sum + a.budget, 0);

    const pendingSpent = activities
      .filter(a => a.status === Status.PENDING)
      .reduce((sum, a) => sum + a.budget, 0);

    const remainingBudget = budgetLimit - totalSpent;
    const usagePercentage = budgetLimit > 0 ? (totalSpent / budgetLimit) * 100 : 0;

    return {
      year: queryYear,
      month: queryMonth + 1, // 1-indexed for client representation
      budgetLimit,
      totalSpent,
      pendingSpent,
      remainingBudget,
      usagePercentage,
      counts: {
        total: totalCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
      },
    };
  }
}
