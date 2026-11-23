/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  APP_URL: string;
  EMAIL_FROM: string;
  BETTER_AUTH_SECRET: string;
  RESEND_API_KEY?: string;
  TELEGRAM_BOT_TOKEN?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}

declare namespace App {
  interface Locals {
    user: { id: string; name: string; email: string } | null;
  }
}
