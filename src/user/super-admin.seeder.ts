import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';
import { UserRepository } from './user.repository.js';
import { UserRole } from './user.types.js';

/**
 * Creates the super admin from SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD on
 * startup, but only when no super admin exists yet. The env password is used
 * once, at creation; change it afterwards with PATCH /auth/password.
 */
@Injectable()
export class SuperAdminSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(SuperAdminSeeder.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const email = this.configService.get<string>('SUPER_ADMIN_EMAIL');
    const password = this.configService.get<string>('SUPER_ADMIN_PASSWORD');

    if (await this.userRepository.existsWithRole(UserRole.SuperAdmin)) {
      return;
    }

    if (!email || !password) {
      this.logger.warn(
        'No super admin exists and SUPER_ADMIN_EMAIL/SUPER_ADMIN_PASSWORD are not set; skipping seed',
      );
      return;
    }

    const created = await this.userRepository.createIfEmailFree({
      firstName: 'Super',
      lastName: 'Admin',
      email,
      password: await bcrypt.hash(password, 10),
      role: UserRole.SuperAdmin,
    });

    if (created) {
      this.logger.log(`Seeded super admin ${email}`);
    } else {
      // Never silently promote an existing account.
      this.logger.warn(
        `No super admin seeded: ${email} already belongs to another user`,
      );
    }
  }
}
