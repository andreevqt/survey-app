import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { AdminRoleGuard } from '../common/guards/admin-role.guard';
import { PollsService } from './polls.service';
import { PollListResponseDto } from './dto/poll-response.dto';

@ApiTags('admin-polls')
@Controller('admin/polls')
@UseGuards(AdminRoleGuard)
export class AdminPollsController {
  constructor(private readonly polls: PollsService) {}

  @Get()
  @ApiOkResponse({ type: PollListResponseDto })
  list(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ): Promise<PollListResponseDto> {
    return this.polls.findAll({ page: Number(page), pageSize: Number(pageSize) }) as any;
  }
}
