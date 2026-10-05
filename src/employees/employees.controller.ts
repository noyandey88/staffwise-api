import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { EmployeesService } from './employees.service.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';
import {
  EmployeeDirectoryDto,
  EmployeeProfileDto,
  EmployeeResponseDto,
} from './dto/employee-response.dto.js';
import { EmployeeContactDto } from './dto/employee-contact.dto.js';
import {
  OrgChartNodeDto,
  OrgChartQueryDto,
  ReportEntryDto,
  ReportsQueryDto,
} from './dto/org-chart.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { type JwtPayload } from '../auth/auth.types.js';
import { EmployeeListQueryDto } from './dto/employee-list-query.dto.js';
import { UpcomingBirthdaysQueryDto } from './dto/upcoming-birthdays-query.dto.js';
import { UpcomingBirthdayResponseDto } from './dto/upcoming-birthday-response.dto.js';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../common/decorators/auth.decorator.js';
import { ApiEnvelope } from '../common/decorators/api-envelope.decorator.js';
import { ApiErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../user/user.types.js';

@ApiTags('Employees')
@Auth()
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post('/create')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Create a new employee',
    description: 'Creates a new employee using the provided details.',
  })
  @ApiEnvelope(EmployeeResponseDto, {
    message: 'Employee created successfully',
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.CONFLICT)
  async create(@Body() data: CreateEmployeeDto) {
    return await this.employeesService.create(data);
  }

  @Get('/get/all')
  @ApiOperation({
    summary: 'List employees',
    description:
      'Directory entries (no personal details), paginated and sorted by name; ' +
      'filter by search text, department, manager or status.',
  })
  @ApiEnvelope(EmployeeDirectoryDto, {
    message: 'Employees retrieved successfully',
    paginated: true,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  async findAll(@Query() query: EmployeeListQueryDto) {
    return await this.employeesService.findPage(query);
  }

  @Get('/birthdays/upcoming')
  @ApiOperation({
    summary: 'Upcoming birthdays',
    description:
      'Current employees whose birthday falls within the next `days` days ' +
      '(today included), soonest first. Employees without a date of birth ' +
      'are skipped; the birth year is not exposed.',
  })
  @ApiEnvelope(UpcomingBirthdayResponseDto, {
    message: 'Upcoming birthdays retrieved successfully',
    isArray: true,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST)
  async upcomingBirthdays(@Query() query: UpcomingBirthdaysQueryDto) {
    return await this.employeesService.upcomingBirthdays(query.days);
  }

  @Get('/get/:id')
  @ApiOperation({
    summary: 'Retrieve an employee by ID',
    description:
      'Directory entry (no personal details); see /employees/:id/profile.',
  })
  @ApiEnvelope(EmployeeDirectoryDto, {
    message: 'Employee retrieved successfully',
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  async findById(@Param('id', ParseIntPipe) id: number) {
    return await this.employeesService.findDirectoryEntry(id);
  }

  @Get('/org-chart')
  @ApiOperation({
    summary: 'Organisation chart',
    description:
      'Current staff as a tree of directory entries (`reports` nested). ' +
      'Someone whose manager has left appears as a root.',
  })
  @ApiEnvelope(OrgChartNodeDto, {
    message: 'Org chart retrieved successfully',
    isArray: true,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async orgChart(@Query() query: OrgChartQueryDto) {
    return await this.employeesService.orgChart(query.rootId);
  }

  @Get('/:id/reports')
  @ApiOperation({
    summary: "An employee's reports",
    description: 'Direct reports; `all=true` for the whole subtree.',
  })
  @ApiEnvelope(ReportEntryDto, {
    message: 'Reports retrieved successfully',
    isArray: true,
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async reports(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ReportsQueryDto,
  ) {
    return await this.employeesService.reportsOf(id, query.all);
  }

  @Get('/:id/managers')
  @ApiOperation({
    summary: "An employee's management chain",
    description: 'Direct manager first, top of the organisation last.',
  })
  @ApiEnvelope(EmployeeDirectoryDto, {
    message: 'Management chain retrieved successfully',
    isArray: true,
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  async managers(@Param('id', ParseIntPipe) id: number) {
    return await this.employeesService.managerChain(id);
  }

  @Get('/me/profile')
  @ApiOperation({ summary: 'My full employee profile' })
  @ApiEnvelope(EmployeeProfileDto, {
    message: 'Profile retrieved successfully',
  })
  @ApiErrorResponses(HttpStatus.NOT_FOUND)
  async myProfile(@CurrentUser('sub') userId: number) {
    return await this.employeesService.myProfile(userId);
  }

  @Patch('/me/profile')
  @ApiOperation({
    summary: 'Update my contact details',
    description:
      'Phone, addresses, blood group and emergency contact; null clears a field. ' +
      'Other fields are maintained by HR.',
  })
  @ApiEnvelope(EmployeeProfileDto, {
    message: 'Profile updated successfully',
  })
  @ApiErrorResponses(HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND)
  async updateMyProfile(
    @CurrentUser('sub') userId: number,
    @Body() dto: EmployeeContactDto,
  ) {
    return await this.employeesService.updateMyProfile(userId, dto);
  }

  @Get('/:id/profile')
  @ApiOperation({
    summary: "An employee's full profile",
    description:
      'Admin/HR: anyone. Others: themselves; managers also their (recursive) reports.',
  })
  @ApiEnvelope(EmployeeProfileDto, {
    message: 'Profile retrieved successfully',
  })
  @ApiErrorResponses(HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  async profile(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.employeesService.findProfile(user, id);
  }

  @Patch('/update')
  @Roles(UserRole.Admin, UserRole.Hr)
  @ApiOperation({
    summary: 'Update an employee',
    description: 'Updates an employee using the provided details.',
  })
  @ApiEnvelope(EmployeeResponseDto, {
    message: 'Employee updated successfully',
  })
  @ApiErrorResponses(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  async update(@Body() data: UpdateEmployeeDto) {
    return await this.employeesService.update(data);
  }

  @Delete('/delete/:id')
  @Roles(UserRole.Admin)
  @ApiOperation({
    summary: 'Delete an employee',
    description: 'Deletes an employee by their ID.',
  })
  @ApiEnvelope(null, {
    message: 'Employee deleted successfully',
  })
  async delete(@Param('id', ParseIntPipe) id: number) {
    return await this.employeesService.delete(id);
  }
}
