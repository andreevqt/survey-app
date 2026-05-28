import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { AdminRoleGuard } from '../common/guards/admin-role.guard';
import { AnalyticsService } from './analytics.service';
import { OwnerAnalyticsDto } from './dto/owner-analytics.dto';
import { SystemAnalyticsDto } from './dto/system-analytics.dto';

@ApiTags('analytics')
@Controller()
export class AnalyticsController {
  constructor(private readonly svc: AnalyticsService) {}

  @Get('polls/:id/analytics')
  @ApiOkResponse({ type: OwnerAnalyticsDto })
  getOwnerAnalytics(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.svc.getOwnerAnalytics(user.id, id);
  }

  @Get('admin/polls/:id/analytics')
  @UseGuards(AdminRoleGuard)
  @ApiOkResponse({ type: OwnerAnalyticsDto })
  getAdminPollAnalytics(@Param('id') id: string) {
    return this.svc.getAnalyticsById(id);
  }

  @Get('admin/analytics')
  @UseGuards(AdminRoleGuard)
  @ApiOkResponse({ type: SystemAnalyticsDto })
  getSystemAnalytics() {
    return this.svc.getSystemAnalytics();
  }
}
