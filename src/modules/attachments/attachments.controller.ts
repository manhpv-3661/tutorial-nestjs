import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AttachmentsService } from './attachments.service';

@ApiTags('attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get(':id')
  async getFile(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const attachment = await this.attachmentsService.findById(id);
    res.setHeader('Content-Type', attachment.fileType);
    res.sendFile(attachment.path);
  }
}
