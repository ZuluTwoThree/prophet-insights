import type { Session, User } from "lucia";

export type AppEnv = {
  Variables: {
    user: User | null;
    session: Session | null;
  };
};
