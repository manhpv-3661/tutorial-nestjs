import { Controller, Get, Param, StreamableFile } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createReadStream } from 'fs';
import { AttachmentsService } from './attachments.service';

@ApiTags('attachments')
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get(':id')
  async getFile(@Param('id') id: string): Promise<StreamableFile> {
    const attachment = await this.attachmentsService.findById(id);
    return new StreamableFile(createReadStream(attachment.path), {
      type: attachment.fileType,
    });
  }
}
