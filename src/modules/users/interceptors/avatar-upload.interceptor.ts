import { BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ALLOWED_AVATAR_MIME_TYPES,
  MAX_AVATAR_SIZE,
} from '../constants/users.constants';

export function createAvatarUploadInterceptor() {
  return FileInterceptor('avatar', {
    limits: { fileSize: MAX_AVATAR_SIZE },
    fileFilter: (_req, file, callback) => {
      if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype)) {
        callback(
          new BadRequestException(
            `Avatar must be one of: ${ALLOWED_AVATAR_MIME_TYPES.join(', ')}`,
          ),
          false,
        );
        return;
      }
      callback(null, true);
    },
  });
}
