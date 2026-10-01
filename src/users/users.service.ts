import * as bcrypt from 'bcryptjs';
import { BadRequestException } from '@nestjs/common';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        schoolName: true,
        gameTokenBalance: true,
        examCreditBalance: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        schoolName: true,
        gameTokenBalance: true,
        examCreditBalance: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  async getProfile(userId: string) {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }
    return {
      ...user,
      isUnlimited: user.role === Role.ADMIN,
    };
  }


  async updateProfile(
    userId: string,
    dto: { name?: string; schoolName?: string; role?: Role },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    const dataToUpdate: any = {};
    if (dto.name && dto.name.trim()) {
      dataToUpdate.name = dto.name.trim();
    }
    if (dto.schoolName !== undefined) {
      dataToUpdate.schoolName = dto.schoolName ? dto.schoolName.trim() : null;
    }
    if (dto.role && user.role !== Role.ADMIN) {
      if (dto.role === Role.TEACHER || dto.role === Role.USER) {
        dataToUpdate.role = dto.role;
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        schoolName: true,
        gameTokenBalance: true,
        examCreditBalance: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...updated,
      isUnlimited: updated.role === Role.ADMIN,
    };
  }

  async changePassword(
    userId: string,
    currentPass: string,
    newPass: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    const isMatch = await bcrypt.compare(currentPass, user.password);
    if (!isMatch) {
      throw new BadRequestException('Kata sandi saat ini tidak cocok');
    }

    if (!newPass || newPass.length < 6) {
      throw new BadRequestException('Kata sandi baru minimal 6 karakter');
    }

    const hashedPassword = await bcrypt.hash(newPass, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Kata sandi berhasil diperbarui' };
  }

  async adminResetPassword(userId: string, customNewPassword?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    const tempPassword =
      customNewPassword?.trim() ||
      ('Satelyd#' + Math.floor(1000 + Math.random() * 9000));

    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return {
      message: 'Kata sandi berhasil direset oleh Admin',
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      temporaryPassword: tempPassword,
    };
  }

  async addGameTokens(userId: string, quantity: number, note?: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          gameTokenBalance: { increment: quantity },
        },
      });

      await tx.tokenTransaction.create({
        data: {
          userId,
          productType: 'GAME_TOKEN',
          amount: quantity,
          type: 'PURCHASE',
          note: note ?? `Pembelian ${quantity} Token Game`,
        },
      });

      return user;
    });
  }

  async deductGameTokens(userId: string, quantity: number, note?: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({ where: { id: userId } });
      if (!current) {
        throw new NotFoundException('Pengguna tidak ditemukan');
      }

      if (current.role === Role.ADMIN) {
        return current;
      }

      if (current.gameTokenBalance < quantity) {
        throw new Error('Saldo Token Game tidak mencukupi');
      }

      const user = await tx.user.update({
        where: { id: userId },
        data: {
          gameTokenBalance: { decrement: quantity },
        },
      });

      await tx.tokenTransaction.create({
        data: {
          userId,
          productType: 'GAME_TOKEN',
          amount: -quantity,
          type: 'CONSUME_GAME_LIMIT',
          note: note ?? 'Pengurangan token untuk membuka batas kartu game',
        },
      });

      return user;
    });
  }

  async addExamCredits(userId: string, quantity: number, note?: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          examCreditBalance: { increment: quantity },
        },
      });

      await tx.tokenTransaction.create({
        data: {
          userId,
          productType: 'EXAM_CREDIT',
          amount: quantity,
          type: 'PURCHASE',
          note: note ?? `Pembelian ${quantity} Kredit Ujian`,
        },
      });

      return user;
    });
  }

  async deductExamCredits(userId: string, quantity: number, note?: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({ where: { id: userId } });
      if (!current) {
        throw new NotFoundException('Pengguna tidak ditemukan');
      }

      if (current.role === Role.ADMIN) {
        return current;
      }

      if (current.examCreditBalance < quantity) {
        throw new Error('Saldo Kredit Ujian tidak mencukupi');
      }

      const user = await tx.user.update({
        where: { id: userId },
        data: {
          examCreditBalance: { decrement: quantity },
        },
      });

      await tx.tokenTransaction.create({
        data: {
          userId,
          productType: 'EXAM_CREDIT',
          amount: -quantity,
          type: 'CONSUME_EXAM',
          note: note ?? 'Pengurangan kredit untuk publikasi mode ujian',
        },
      });

      return user;
    });
  }
}
