import { ApiProperty } from '@nestjs/swagger';
import { User } from '../entities/user.entity';

class UserResponseFields {
  @ApiProperty()
  email: string;

  @ApiProperty()
  token: string;

  @ApiProperty()
  username: string;

  @ApiProperty({ nullable: true })
  bio: string | null;

  @ApiProperty({ nullable: true })
  image: string | null;
}

export class UserResponseDto {
  @ApiProperty({ type: UserResponseFields })
  user: UserResponseFields;

  static fromEntity(user: User, token: string): UserResponseDto {
    const dto = new UserResponseDto();
    dto.user = {
      email: user.email,
      token,
      username: user.username,
      bio: user.bio,
      image: user.image,
    };
    return dto;
  }
}
