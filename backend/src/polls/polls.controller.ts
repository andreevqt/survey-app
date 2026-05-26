import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PollsService } from './polls.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { UpdatePollDto } from './dto/update-poll.dto';
import { ToggleActiveDto } from './dto/toggle-active.dto';
import { PollDetailDto, PollListResponseDto, PollSummaryDto } from './dto/poll-response.dto';

@ApiTags('polls')
@Controller('polls')
export class PollsController {
  constructor(private readonly polls: PollsService) {}

  @Get()
  @ApiOkResponse({ type: PollListResponseDto })
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ): Promise<PollListResponseDto> {
    return this.polls.findMine(user.id, { page: Number(page), pageSize: Number(pageSize) }) as any;
  }

  @Post()
  @ApiCreatedResponse({ type: PollDetailDto })
  create(@CurrentUser() user: CurrentUserPayload, @Body() body: CreatePollDto) {
    return this.polls.create(user.id, body) as any;
  }

  @Get(':id')
  @ApiOkResponse({ type: PollDetailDto })
  get(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.polls.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: PollDetailDto })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: UpdatePollDto,
  ) {
    return this.polls.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    await this.polls.delete(user.id, id);
  }

  @Patch(':id/active')
  @ApiOkResponse({ type: PollSummaryDto })
  async toggleActive(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: ToggleActiveDto,
  ) {
    await this.polls.toggleActive(user.id, id, body.isActive);
    return this.polls.findOne(user.id, id);
  }
}
