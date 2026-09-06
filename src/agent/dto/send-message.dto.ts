import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @MinLength(1, { message: 'Message cannot be empty.' })
  @MaxLength(2000)
  message!: string;

  /** Continue an existing conversation. Omit to start a new one. */
  @IsOptional()
  @IsString()
  conversationId?: string;

  /** Attach the conversation to a trip so the agent has its itinerary in context. */
  @IsOptional()
  @IsString()
  tripId?: string;
}
