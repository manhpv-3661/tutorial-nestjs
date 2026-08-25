import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';

class ProfileFields {
  @ApiProperty()
  username: string;

  @ApiProperty({ nullable: true })
  bio: string | null;

  @ApiProperty({ nullable: true })
  image: string | null;

  @ApiProperty()
  following: boolean;
}

export class ProfileResponseDto {
  @ApiProperty({ type: ProfileFields })
  profile: ProfileFields;

  static fromEntity(user: User, following: boolean): ProfileResponseDto {
    const dto = new ProfileResponseDto();
    dto.profile = {
      username: user.username,
      bio: user.bio,
      image: user.image,
      following,
    };
    return dto;
  }
}
