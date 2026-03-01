import { IsIn, IsInt, IsString, Min } from 'class-validator';

export class CreateMonitorJobDto {
  @IsIn(['openai', 'anthropic', 'gemini', 'grok'])
  provider!: 'openai' | 'anthropic' | 'gemini' | 'grok';

  @IsString()
  model!: string;

  @IsString()
  apiKey!: string;

  @IsString()
  prompt!: string;

  @IsInt()
  @Min(10)
  intervalSeconds!: number;
}