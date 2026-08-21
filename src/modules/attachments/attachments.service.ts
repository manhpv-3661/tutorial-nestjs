import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import { I18nService } from 'nestjs-i18n';
import * as path from 'path';
import { Repository } from 'typeorm';
import { Attachment, AttachmentOwnerType } from './entities/attachment.entity';

const STORAGE_ROOT = path.join(process.cwd(), 'storage', 'uploads');

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentsRepository: Repository<Attachment>,
    private readonly i18n: I18nService,
  ) {}

  async saveFile(
    ownerType: AttachmentOwnerType,
    ownerId: string,
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
  ): Promise<Attachment> {
    await fs.mkdir(STORAGE_ROOT, { recursive: true });

    const storedName = `${randomUUID()}${path.extname(file.originalname)}`;
    const storedPath = path.join(STORAGE_ROOT, storedName);
    await fs.writeFile(storedPath, file.buffer);

    return this.attachmentsRepository.save(
      this.attachmentsRepository.create({
        ownerType,
        ownerId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        path: storedPath,
      }),
    );
  }

  async findById(id: string): Promise<Attachment> {
    const attachment = await this.attachmentsRepository.findOne({
      where: { id },
    });
    if (!attachment) {
      throw new NotFoundException(this.i18n.t('errors.attachmentNotFound'));
    }
    return attachment;
  }

  async deleteAllForOwner(
    ownerType: AttachmentOwnerType,
    ownerId: string,
  ): Promise<void> {
    const attachments = await this.attachmentsRepository.find({
      where: { ownerType, ownerId },
    });

    for (const attachment of attachments) {
      await fs.unlink(attachment.path).catch(() => undefined);
    }
    if (attachments.length > 0) {
      await this.attachmentsRepository.remove(attachments);
    }
  }
}
