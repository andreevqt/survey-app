import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
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
import { RegisterResponseDto } from './dto/register-response.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

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
  @ApiCreatedResponse({ type: RegisterResponseDto })
  async register(@Body() body: RegisterDto, @Res({ passthrough: true }) res: Response): Promise<RegisterResponseDto> {
    const result = await this.auth.register(body);
    if (result.status === 'verified') {
      this.setCookies(res, result.tokens);
      return { status: 'verified', email: result.user.email, user: result.user };
    }
    return { status: 'verification_required', email: result.email };
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

  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: AuthResponseDto })
  async verifyEmail(@Body() body: VerifyEmailDto, @Res({ passthrough: true }) res: Response): Promise<AuthResponseDto> {
    const result = await this.auth.verifyEmail(body.token);
    this.setCookies(res, result.tokens);
    return { user: result.user };
  }

  @Post('resend-verification')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  async resendVerification(@Body() body: ResendVerificationDto): Promise<void> {
    await this.auth.resendVerification(body.email);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(@Body() body: ForgotPasswordDto): Promise<void> {
    await this.auth.forgotPassword(body.email);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() body: ResetPasswordDto): Promise<void> {
    await this.auth.resetPassword(body.token, body.newPassword);
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

  @Patch('me')
  @ApiOkResponse({ type: AuthUserDto })
  async updateMe(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: UpdateMeDto,
  ): Promise<AuthUserDto> {
    return this.auth.updateMe(user.id, body);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: ChangePasswordDto,
  ): Promise<void> {
    await this.auth.changePassword(user.id, body);
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
