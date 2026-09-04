import { ApiProperty } from '@nestjs/swagger';
import { IsNonBlankString } from '../../../common/decorators/is-non-blank-string.decorator';
import { MAX_BODY_LENGTH } from '../constants/comments.constants';

export class CreateCommentDto {
  @ApiProperty()
  @IsNonBlankString(MAX_BODY_LENGTH, {
    minLength: 'validation.MIN_LENGTH_BODY',
    maxLength: 'validation.MAX_LENGTH_COMMENT_BODY',
  })
  body: string;
}
