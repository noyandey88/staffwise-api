import { ApiProperty } from '@nestjs/swagger';

// Birth year is deliberately left out: colleagues see the day, not the age.
export class UpcomingBirthdayResponseDto {
  employeeId!: number;
  firstName!: string;
  lastName!: string;
  jobTitle!: string;
  departmentId!: number;
  departmentName!: string;

  @ApiProperty({ example: '10-21', description: 'MM-DD' })
  birthday!: string;

  @ApiProperty({
    example: '2026-10-21',
    description: 'Date it is celebrated next (Feb 29 falls on Feb 28)',
  })
  nextBirthday!: string;

  @ApiProperty({ example: 16, description: '0 means today' })
  daysUntil!: number;
}
