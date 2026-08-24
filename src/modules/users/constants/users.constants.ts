export const SALT_ROUNDS = 10;

export const ALLOWED_AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const UPDATE_USER_SCHEMA = {
  type: 'object',
  properties: {
    username: { type: 'string' },
    email: { type: 'string' },
    password: { type: 'string' },
    bio: { type: 'string' },
    avatar: { type: 'string', format: 'binary' },
  },
};
