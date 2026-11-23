import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import { Kysely } from 'kysely';
import { D1Dialect } from 'kysely-d1';
import { sendEmail } from './alerts';

export type SocialProvider = 'google' | 'github';

/** Social logins whose keys are set. Buttons for the others show a "not set up" message. */
export function configuredProviders(env: Env): SocialProvider[] {
  const list: SocialProvider[] = [];
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) list.push('google');
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) list.push('github');
  return list;
}

// Passwordless: email magic link + Google / GitHub.
// Better Auth needs the request's D1 binding, so build it per environment.
export function createAuth(env: Env) {
  const on = configuredProviders(env);
  return betterAuth({
    baseURL: env.APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: {
      db: new Kysely<any>({ dialect: new D1Dialect({ database: env.DB }) }),
      type: 'sqlite',
    },
    plugins: [
      magicLink({
        expiresIn: 60 * 15, // 15 minutes
        sendMagicLink: async ({ email, url }) => {
          await sendEmail(env, email, 'Your sign-in link',
            `Click the link below to sign in. It works once and expires in 15 minutes.\n\n${url}\n\nIf you didn't ask for this, you can ignore this email.`);
        },
      }),
    ],
    socialProviders: {
      ...(on.includes('google') && { google: { clientId: env.GOOGLE_CLIENT_ID!, clientSecret: env.GOOGLE_CLIENT_SECRET!, prompt: 'select_account' as const } }),
      ...(on.includes('github') && { github: { clientId: env.GITHUB_CLIENT_ID!, clientSecret: env.GITHUB_CLIENT_SECRET! } }),
    },
    // Same email via Google/GitHub/magic link = same account.
    account: {
      accountLinking: { enabled: true, trustedProviders: ['google', 'github'] },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24,
    },
  });
}
