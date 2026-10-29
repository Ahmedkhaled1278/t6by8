import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { SocialController } from './social/social.controller';
import { MediaController } from './media/media.controller';
import { MessagingController } from './messaging/messaging.controller';
import { NotificationsController } from './notifications/notifications.controller';
import { SearchController } from './social/search.controller';
import { StoriesController } from './stories/stories.controller';
import { ReportsController } from './reports/reports.controller';
import { PushController } from './push/push.controller';
import { MediaService } from './media/media.service';
import { MessagingService } from './messaging/messaging.service';
import { NotificationsService } from './notifications/notifications.service';
import { StoriesService } from './stories/stories.service';
import { ReportsService } from './reports/reports.service';
import { MessagingGateway } from './messaging/messaging.gateway';
import { PushService } from './push/push.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [
    HealthController,
    SocialController,
    MediaController,
    MessagingController,
    NotificationsController,
    SearchController,
    StoriesController,
    ReportsController,
    PushController,
  ],
  providers: [
    MediaService,
    MessagingService,
    NotificationsService,
    StoriesService,
    ReportsService,
    MessagingGateway,
    PushService,
  ],
})
export class AppModule {}
