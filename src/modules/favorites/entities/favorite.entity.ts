import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Article } from '../../articles/entities/article.entity';
import { User } from '../../users/entities/user.entity';

@Entity('article_favorites')
export class Favorite {
  @PrimaryColumn({ name: 'user_id' })
  userId: string;

  @PrimaryColumn({ name: 'article_id' })
  articleId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Article)
  @JoinColumn({ name: 'article_id' })
  article: Article;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
