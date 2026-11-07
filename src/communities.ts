import { env } from "./env.ts";
import { HttpError } from "./http.ts";
import { getSubredditAbout, type Community } from "./reddit.ts";

type CacheEntry = { community: Community; expiresAt: number };

const cache = new Map<string, CacheEntry>();

export function allowedNames() {
  return env.subreddits;
}

export function isAllowed(name: string) {
  return allowedNames().includes(name.trim().replace(/^r\//i, "").toLowerCase());
}

export async function getCommunity(name: string) {
  const key = name.trim().replace(/^r\//i, "").toLowerCase();
  if (!isAllowed(key)) {
    throw new HttpError(404, "That subreddit is not on the Sanctum allowlist.");
  }

  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.community;
  }

  const community = await getSubredditAbout(key);
  cache.set(key, { community, expiresAt: Date.now() + env.cacheSeconds * 1000 });
  return community;
}

export async function listCommunities() {
  const names = allowedNames();
  if (!names.length) {
    throw new HttpError(503, "REDDIT_SUBREDDITS is empty.");
  }
  return Promise.all(names.map((name) => getCommunity(name)));
}

export function resetCacheForTests() {
  cache.clear();
}
