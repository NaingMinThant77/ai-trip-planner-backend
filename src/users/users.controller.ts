import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MAX_AVATAR_BYTES } from '../media/cloudinary.service';
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

  /**
   * `memoryStorage`, unlike the trip-photo route: the bytes go straight on to Cloudinary, so
   * writing them to disk first would only leave a file to clean up.
   */
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_AVATAR_BYTES },
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: SafeUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<UserProfile> {
    if (!file) {
      throw new BadRequestException('No image was uploaded under the field name "file".');
    }
    return this.users.updateAvatar(user.id, file);
  }

  /** Returns the profile rather than 204 so the UI can fall straight back to initials. */
  @Delete('avatar')
  async removeAvatar(@CurrentUser() user: SafeUser): Promise<UserProfile> {
    return this.users.removeAvatar(user.id);
  }
}
