import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiCreatedResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { TokensService } from './tokens.service';
import { JwtRefreshGuard } from '../common/guards/jwt-refresh.guard';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';

@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAccessGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokensService,
  ) {}

  @Post('register')
  @Public()
  @ApiCreatedResponse({ type: AuthResponseDto })
  async register(@Body() body: RegisterDto, @Res({ passthrough: true }) res: Response): Promise<AuthResponseDto> {
    const result = await this.auth.register(body);
    this.setCookies(res, result.tokens);
    return { user: result.user };
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response): Promise<AuthResponseDto> {
    const result = await this.auth.login(body);
    this.setCookies(res, result.tokens);
    return { user: result.user };
  }

  @Post('refresh')
  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<AuthResponseDto> {
    const payload = req.user as { id: string; jti: string };
    const result = await this.auth.refresh({ userId: payload.id, jti: payload.jti });
    this.setCookies(res, result.tokens);
    return { user: result.user };
  }

  @Post('logout')
  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const payload = req.user as { id: string; jti: string };
    await this.auth.logout({ userId: payload.id, jti: payload.jti });
    this.clearCookies(res);
  }

  @Get('me')
  @ApiOkResponse({ type: AuthUserDto })
  async me(@CurrentUser() user: CurrentUserPayload): Promise<AuthUserDto> {
    return this.auth.findUserById(user.id);
  }

  private setCookies(res: Response, t: { accessToken: string; refreshToken: string }) {
    res.cookie('access_token', t.accessToken, this.tokens.cookieOptions('access'));
    res.cookie('refresh_token', t.refreshToken, this.tokens.cookieOptions('refresh'));
  }

  private clearCookies(res: Response) {
    res.clearCookie('access_token', { path: '/api/v1' });
    res.clearCookie('refresh_token', { path: '/api/v1' });
  }
}
