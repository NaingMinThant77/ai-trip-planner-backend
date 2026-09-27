import { IsEmail, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { COLLABORATOR_ROLES, CollaboratorRole } from '../../trips/trip.constants';
import { INVITE_CODE_LENGTH } from '../../users/invite-code';

export class AddCollaboratorDto {
  @IsEmail({}, { message: 'A valid email address is required.' })
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  /** Defaults to 'viewer' in the service when omitted. */
  @IsOptional()
  @IsIn(COLLABORATOR_ROLES)
  role?: CollaboratorRole;
}

export class AddCollaboratorByCodeDto {
  @IsString()
  @Length(INVITE_CODE_LENGTH, INVITE_CODE_LENGTH + 4, {
    message: 'An invite code is 6 characters.',
  })
  code!: string;

  @IsOptional()
  @IsIn(COLLABORATOR_ROLES)
  role?: CollaboratorRole;
}

export class UpdateCollaboratorRoleDto {
  @IsIn(COLLABORATOR_ROLES, { message: `role must be one of: ${COLLABORATOR_ROLES.join(', ')}` })
  role!: CollaboratorRole;
}
