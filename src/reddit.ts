import { env } from "./env.ts";
import { HttpError } from "./http.ts";

type Token = { accessToken: string; expiresAt: number };

export type Community = {
  name: string;
  title: string;
  publicDescription: string;
  subscribers: number;
  activeUserCount: number;
  iconUrl: string;
  url: string;
};

type AboutResponse = {
  kind?: string;
  data?: {
    display_name?: string;
    title?: string;
    public_description?: string;
    subscribers?: number;
    active_user_count?: number;
    icon_img?: string;
    community_icon?: string;
    url?: string;
  };
};

let token: Token | null = null;

function stripQuery(url: string) {
  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }
  const cut = trimmed.indexOf("?");
  return cut === -1 ? trimmed : trimmed.slice(0, cut);
}

function mapAbout(body: AboutResponse): Community | null {
  const data = body.data;
  if (!data?.display_name) {
    return null;
  }
  return {
    name: data.display_name,
    title: data.title ?? "",
    publicDescription: data.public_description ?? "",
    subscribers: Number(data.subscribers ?? 0),
    activeUserCount: Number(data.active_user_count ?? 0),
    iconUrl: stripQuery(data.community_icon || data.icon_img || ""),
    url: data.url ? `https://www.reddit.com${data.url}` : `https://www.reddit.com/r/${data.display_name}/`
  };
}

async function redditFetch(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "User-Agent": env.redditUserAgent,
      ...(init.headers ?? {})
    }
  });
  if (!response.ok) {
    throw new HttpError(502, `Reddit request failed (${response.status}).`);
  }
  return response;
}

export async function getAccessToken() {
  if (token && token.expiresAt > Date.now() + 30_000) {
    return token.accessToken;
  }
  if (!env.redditClientId || !env.redditClientSecret) {
    throw new HttpError(503, "Reddit credentials are not configured.");
  }

  const basic = Buffer.from(`${env.redditClientId}:${env.redditClientSecret}`).toString("base64");
  const response = await redditFetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });
  const body = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) {
    throw new HttpError(502, "Reddit did not return an access token.");
  }
  token = {
    accessToken: body.access_token,
    expiresAt: Date.now() + Math.max(60, Number(body.expires_in ?? 3600)) * 1000
  };
  return token.accessToken;
}

export async function getSubredditAbout(name: string): Promise<Community> {
  const accessToken = await getAccessToken();
  const response = await redditFetch(`https://oauth.reddit.com/r/${encodeURIComponent(name)}/about`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const community = mapAbout((await response.json()) as AboutResponse);
  if (!community) {
    throw new HttpError(404, `Subreddit ${name} was not found.`);
  }
  return community;
}

export function resetAuthForTests() {
  token = null;
}
