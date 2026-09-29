import { UserResponseDto } from '../../user/dto/user-response.dto.js';

/** Return shape of AuthService.refreshAccessToken. */
export class TokenPairResponseDto {
  accessToken!: string;
  refreshToken!: string;
  accessTokenExpiresIn!: number;
  refreshTokenExpiresIn!: number;
}

/** Return shape of AuthService.loginUser. */
export class LoginResponseDto extends TokenPairResponseDto {
  user!: UserResponseDto;
}
