import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AddFamilyMemberDto } from './dto/add-family-member.dto';

export type FamilyMemberDto = {
  id: string;
  userId: string;
  name: string;
  email: string;
  addedAt: string;
};

@Injectable()
export class FamilyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async list(ownerId: string): Promise<FamilyMemberDto[]> {
    const rows = await this.prisma.familyMember.findMany({
      where: { ownerId },
      orderBy: { addedAt: 'asc' },
      include: { member: { select: { id: true, name: true, email: true } } },
    });

    return rows.map((row) => ({
      id: row.id,
      userId: row.member.id,
      name: row.member.name,
      email: row.member.email,
      addedAt: row.addedAt.toISOString(),
    }));
  }

  /**
   * One-directional (decision #19). The code identifies the person being added; it grants
   * them nothing, so a leaked code cannot be used to read anyone's trips.
   */
  async add(ownerId: string, dto: AddFamilyMemberDto): Promise<FamilyMemberDto> {
    const member = await this.users.findSafeByInviteCode(dto.code);
    // Deliberately the same message for a malformed code and an unknown one — otherwise
    // this endpoint becomes an oracle for which codes exist.
    if (!member) throw new NotFoundException('No one uses that invite code.');
    if (member.id === ownerId) throw new BadRequestException('That is your own invite code.');

    const existing = await this.prisma.familyMember.findFirst({
      where: { ownerId, memberId: member.id },
    });
    if (existing) throw new ConflictException(`${member.name} is already in your family.`);

    const row = await this.prisma.familyMember.create({
      data: { ownerId, memberId: member.id },
    });

    return {
      id: row.id,
      userId: member.id,
      name: member.name,
      email: member.email,
      addedAt: row.addedAt.toISOString(),
    };
  }

  async remove(ownerId: string, id: string): Promise<void> {
    // Scoped by ownerId so one person cannot delete someone else's row by guessing an id.
    const existing = await this.prisma.familyMember.findFirst({ where: { id, ownerId } });
    if (!existing) throw new NotFoundException('That family member was not found.');
    await this.prisma.familyMember.delete({ where: { id } });
  }
}
