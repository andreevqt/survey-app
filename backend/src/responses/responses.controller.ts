import { Body, Controller, Get, HttpCode, Param, Post, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Public } from '../common/decorators/public.decorator';
import { ResponsesService } from './responses.service';
import { PublicPollDto } from './dto/public-poll.dto';
import { SubmitResponseDto, SubmitResultDto } from './dto/submit-response.dto';

@ApiTags('public')
@Controller('public/polls')
export class ResponsesController {
  constructor(private readonly svc: ResponsesService) {}

  @Get(':slug')
  @Public()
  @ApiOkResponse({ type: PublicPollDto })
  async getPublic(@Param('slug') slug: string): Promise<PublicPollDto> {
    return this.svc.getPublic(slug) as any;
  }

  @Post(':slug/responses')
  @Public()
  @HttpCode(201)
  @ApiCreatedResponse({ type: SubmitResultDto })
  async submit(
    @Param('slug') slug: string,
    @Body() body: SubmitResponseDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SubmitResultDto> {
    // Resolve the public poll first so we know its id for the cookie name.
    const poll = await this.svc.getPublic(slug);
    const cookieName = `respondent_${poll.id}`;
    let cookieVal: string | undefined = req.cookies?.[cookieName];
    if (!cookieVal) {
      cookieVal = randomUUID();
      res.cookie(cookieName, cookieVal, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: `/api/v1/public/polls/${slug}`,
        maxAge: 365 * 24 * 60 * 60 * 1000,
      });
    }
    return this.svc.submit({ slug, respondentCookie: cookieVal, answers: body.answers });
  }
}
