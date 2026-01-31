import { Injectable, UnauthorizedException, ConflictException, Inject, Logger, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { DatabaseService } from '../database/database.module';
import { RegisterDto, LoginDto, GoogleAuthDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject('DatabaseService') private db: DatabaseService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if user exists
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = await this.usersService.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      ...tokens,
    };
  }

  async googleAuth(dto: GoogleAuthDto) {
    this.logger.log(`Google auth attempt for email: ${dto.email}`);
    
    try {
      // Validate required fields
      if (!dto.googleId || !dto.email || !dto.name) {
        this.logger.warn('Missing required Google auth fields');
        throw new UnauthorizedException('Invalid Google auth data');
      }
      
      this.logger.log(`Looking up user by googleId: ${dto.googleId}`);
      let user = await this.usersService.findByGoogleId(dto.googleId);
      
      if (!user) {
        this.logger.log(`No user found by googleId, checking email: ${dto.email}`);
        // Check if email already exists
        user = await this.usersService.findByEmail(dto.email);
        
        if (user) {
          // Link Google account to existing user
          this.logger.log(`Linking Google account to existing user: ${user.id}`);
          await this.usersService.update(user.id, { googleId: dto.googleId });
        } else {
          // Create new user
          this.logger.log(`Creating new user for: ${dto.email}`);
          user = await this.usersService.create({
            email: dto.email,
            name: dto.name,
            googleId: dto.googleId,
            avatarUrl: dto.avatarUrl,
            emailVerified: true,
          });
          this.logger.log(`Created new user: ${user.id}`);
        }
      }

      this.logger.log(`Generating tokens for user: ${user.id}`);
      const tokens = await this.generateTokens(user.id);

      this.logger.log(`Google auth successful for user: ${user.id}`);
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        ...tokens,
      };
    } catch (error) {
      this.logger.error(`Google auth failed: ${error.message}`, error.stack);
      if (error instanceof UnauthorizedException || error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException(`Authentication failed: ${error.message}`);
    }
  }

  async refreshToken(refreshToken: string) {
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    
    // Find valid refresh token
    const result = await this.db.query(
      `SELECT * FROM refresh_tokens 
       WHERE user_id = (
         SELECT user_id FROM refresh_tokens 
         WHERE token_hash = $1 AND expires_at > NOW() AND revoked_at IS NULL
       )`,
      [refreshToken],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userId = result.rows[0].user_id;

    // Revoke old token
    await this.db.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`,
      [refreshToken],
    );

    // Generate new tokens
    return this.generateTokens(userId);
  }

  async logout(userId: string) {
    // Revoke all refresh tokens for user
    await this.db.query(
      `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
  }

  private async generateTokens(userId: string) {
    const payload = { sub: userId };
    
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Store refresh token
    await this.db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [userId, refreshToken, expiresAt],
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }
}
