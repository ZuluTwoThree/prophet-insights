import { GitHub, Google } from "arctic";
import { env } from "../env";

const githubRedirectUri = new URL("/api/auth/github/callback", env.APP_URL).toString();
const googleRedirectUri = new URL("/api/auth/google/callback", env.APP_URL).toString();

export const github =
  env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
    ? new GitHub(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET, githubRedirectUri)
    : null;

export const google =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? new Google(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, googleRedirectUri)
    : null;
