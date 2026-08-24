export interface UserEnvelope {
  user: {
    username: string;
    email: string;
    token: string;
    bio: string | null;
    image: string | null;
  };
}

export interface ProfileEnvelope {
  profile: {
    username: string;
    bio: string | null;
    image: string | null;
    following: boolean;
  };
}

export interface ErrorEnvelope {
  errors: { body: string[] };
}
