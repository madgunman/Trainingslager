import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SessionData = {
  playerId?: number;
  playerName?: string;
  isAdmin?: boolean;
};

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "dev-only-secret-change-me-32chars!!",
  cookieName: "psv_training_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export async function requirePlayer() {
  const session = await getSession();
  if (!session.playerId || !session.playerName) {
    return null;
  }
  return session;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session.isAdmin) {
    return null;
  }
  return session;
}
