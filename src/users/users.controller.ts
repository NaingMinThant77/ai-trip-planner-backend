import { Body, Controller, Get, NotFoundException, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SafeUser, UserProfile, UsersService } from './users.service';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async getProfile(@CurrentUser() user: SafeUser): Promise<UserProfile> {
    const profile = await this.users.getProfile(user.id);
    if (!profile) throw new NotFoundException('Profile not found.');
    return profile;
  }

  @Patch()
  async updateProfile(
    @CurrentUser() user: SafeUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfile> {
    return this.users.updateProfile(user.id, dto);
  }
}
