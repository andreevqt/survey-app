import { Body, Controller, Get, Header, HttpCode, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { AdminRoleGuard } from '../common/guards/admin-role.guard';
import { UsersService } from './users.service';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UserListResponseDto } from './dto/user-list-response.dto';
import { UserSummaryDto } from './dto/user-summary.dto';
import { ChangeRoleDto } from './dto/change-role.dto';
import { BulkDeleteDto, BulkDeleteResultDto } from './dto/bulk-delete.dto';

@ApiTags('admin-users')
@Controller('admin/users')
@UseGuards(AdminRoleGuard)
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Get()
  @ApiOkResponse({ type: UserListResponseDto })
  list(@Query() q: ListUsersQueryDto) {
    return this.svc.list(q);
  }

  @Patch(':id/role')
  @ApiOkResponse({ type: UserSummaryDto })
  changeRole(
    @CurrentUser() admin: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: ChangeRoleDto,
  ) {
    return this.svc.changeRole({ adminId: admin.id, userId: id, role: body.role });
  }

  @Post('bulk-delete')
  @HttpCode(200)
  @ApiOkResponse({ type: BulkDeleteResultDto })
  bulkDelete(@CurrentUser() admin: CurrentUserPayload, @Body() body: BulkDeleteDto) {
    return this.svc.bulkDelete({ adminId: admin.id, ids: body.ids });
  }

  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="users.csv"')
  async exportCsv(@Res({ passthrough: false }) res: Response) {
    const csv = await this.svc.streamCsv();
    res.end(csv);
  }
}
