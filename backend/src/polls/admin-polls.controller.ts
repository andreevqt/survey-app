import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { AdminRoleGuard } from '../common/guards/admin-role.guard';
import { PollsService } from './polls.service';
import { UpdatePollDto } from './dto/update-poll.dto';
import { ToggleActiveDto } from './dto/toggle-active.dto';
import { PollDetailDto, PollListResponseDto, PollSummaryDto } from './dto/poll-response.dto';

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

  @Get(':id')
  @ApiOkResponse({ type: PollDetailDto })
  getOne(@Param('id') id: string) {
    return this.polls.findOneById(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: PollDetailDto })
  update(@Param('id') id: string, @Body() body: UpdatePollDto) {
    return this.polls.updateById(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.polls.deleteById(id);
  }

  @Patch(':id/active')
  @ApiOkResponse({ type: PollSummaryDto })
  async toggleActive(@Param('id') id: string, @Body() body: ToggleActiveDto) {
    await this.polls.toggleActiveById(id, body.isActive);
    return this.polls.findOneById(id);
  }
}
