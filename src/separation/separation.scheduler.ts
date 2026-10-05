import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SeparationService } from './separation.service.js';
import { ATTENDANCE_TIMEZONE } from '../attendance/attendance.constants.js';

/**
 * Applies separations the day after the last working day. Also runs at
 * startup so a missed midnight (deploy, outage) is caught up. Safe on
 * several instances: completion is a conditional update.
 */
@Injectable()
export class SeparationScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeparationScheduler.name);

  constructor(private readonly separationService: SeparationService) {}

  onApplicationBootstrap() {
    void this.run();
  }

  @Cron('5 0 * * *', { timeZone: ATTENDANCE_TIMEZONE })
  async run() {
    try {
      await this.separationService.completeDue();
    } catch (err) {
      this.logger.error({ err }, 'Completing due separations failed');
    }
  }
}
