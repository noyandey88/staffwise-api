import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SeparationService } from './separation.service.js';

/**
 * Applies separations once the last working day has passed (checked
 * hourly in the organisation's timezone). Also runs at
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

  // Hourly rather than at local midnight: the organisation's timezone is
  // configurable, and completing is a no-op until a separation is due.
  @Cron('5 * * * *')
  async run() {
    try {
      await this.separationService.completeDue();
    } catch (err) {
      this.logger.error({ err }, 'Completing due separations failed');
    }
  }
}
