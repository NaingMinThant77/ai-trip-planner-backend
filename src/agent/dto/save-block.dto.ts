import { IsObject, IsOptional, IsString } from 'class-validator';

export class SaveBlockDto {
  /**
   * The trip to save into. Omit for a `trip_summary`, which creates one. The server never
   * trusts `block` — it is re-validated with the same parser as model output.
   */
  @IsOptional()
  @IsString()
  tripId?: string;

  /**
   * The chat this card came from. For a `trip_summary` the new trip is attached to it, so the
   * conversation reappears when that trip is picked later. Ignored for other card types.
   */
  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsObject()
  block!: Record<string, unknown>;
}
