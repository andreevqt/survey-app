import { Module } from '@nestjs/common';
import { PollsController } from './polls.controller';
import { PollsService } from './polls.service';
import { SlugService } from './slug.service';

@Module({
  controllers: [PollsController],
  providers: [PollsService, SlugService],
  exports: [PollsService],
})
export class PollsModule {}
