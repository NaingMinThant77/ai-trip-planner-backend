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

  /**
   * Mutual (superseding decision #19): a single row represents the relationship regardless of
   * who typed the code, so it shows up in both people's lists and a delete from either side
   * removes it for both.
   */
  async list(userId: string): Promise<FamilyMemberDto[]> {
    const rows = await this.prisma.familyMember.findMany({
      where: { OR: [{ ownerId: userId }, { memberId: userId }] },
      orderBy: { addedAt: 'asc' },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        member: { select: { id: true, name: true, email: true } },
      },
    });

    return rows.map((row) => {
      const other = row.ownerId === userId ? row.member : row.owner;
      return {
        id: row.id,
        userId: other.id,
        name: other.name,
        email: other.email,
        addedAt: row.addedAt.toISOString(),
      };
    });
  }

  async add(userId: string, dto: AddFamilyMemberDto): Promise<FamilyMemberDto> {
    const member = await this.users.findSafeByInviteCode(dto.code);
    // Deliberately the same message for a malformed code and an unknown one — otherwise
    // this endpoint becomes an oracle for which codes exist.
    if (!member) throw new NotFoundException('No one uses that invite code.');
    if (member.id === userId) throw new BadRequestException('That is your own invite code.');

    // Checked in both directions — the relationship is the same one whichever side typed
    // the other's code first.
    const existing = await this.prisma.familyMember.findFirst({
      where: {
        OR: [
          { ownerId: userId, memberId: member.id },
          { ownerId: member.id, memberId: userId },
        ],
      },
    });
    if (existing) throw new ConflictException(`${member.name} is already in your family.`);

    const row = await this.prisma.familyMember.create({
      data: { ownerId: userId, memberId: member.id },
    });

    return {
      id: row.id,
      userId: member.id,
      name: member.name,
      email: member.email,
      addedAt: row.addedAt.toISOString(),
    };
  }

  /** Used by the messages module to gate direct messages to mutual family members only. */
  async areFamily(userId: string, otherId: string): Promise<boolean> {
    const row = await this.prisma.familyMember.findFirst({
      where: {
        OR: [
          { ownerId: userId, memberId: otherId },
          { ownerId: otherId, memberId: userId },
        ],
      },
    });
    return row !== null;
  }

  async remove(userId: string, id: string): Promise<void> {
    // Scoped to rows where the caller is either side, so one person cannot delete someone
    // else's unrelated row by guessing an id, but either side of a mutual relationship can
    // end it.
    const existing = await this.prisma.familyMember.findFirst({
      where: { id, OR: [{ ownerId: userId }, { memberId: userId }] },
    });
    if (!existing) throw new NotFoundException('That family member was not found.');
    await this.prisma.familyMember.delete({ where: { id } });
  }
}
