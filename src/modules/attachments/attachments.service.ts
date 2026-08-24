import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import { I18nService } from 'nestjs-i18n';
import * as path from 'path';
import { EntityManager, Repository } from 'typeorm';
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
    file: Express.Multer.File,
    manager?: EntityManager,
  ): Promise<Attachment> {
    await fs.mkdir(STORAGE_ROOT, { recursive: true });

    const storedName = `${randomUUID()}${path.extname(file.originalname)}`;
    const storedPath = path.join(STORAGE_ROOT, storedName);
    await fs.writeFile(storedPath, file.buffer);

    const repository = this.repositoryFor(manager);
    return repository.save(
      repository.create({
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
    manager?: EntityManager,
  ): Promise<void> {
    const repository = this.repositoryFor(manager);
    const attachments = await repository.find({
      where: { ownerType, ownerId },
    });

    await Promise.all(
      attachments.map((attachment) =>
        fs.unlink(attachment.path).catch(() => undefined),
      ),
    );
    if (attachments.length > 0) {
      await repository.remove(attachments);
    }
  }

  private repositoryFor(manager?: EntityManager): Repository<Attachment> {
    return manager
      ? manager.getRepository(Attachment)
      : this.attachmentsRepository;
  }
}
