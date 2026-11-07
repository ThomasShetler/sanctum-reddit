function required(name: string) {
  return (process.env[name] ?? "").trim();
}

function number(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function subreddits() {
  return required("REDDIT_SUBREDDITS")
    .split(",")
    .map((name) => name.trim().replace(/^r\//i, "").toLowerCase())
    .filter(Boolean);
}

/** Process configuration. Secrets stay in the environment, never in the repo. */
export const env = {
  port: number("PORT", 5081),
  redditClientId: required("REDDIT_CLIENT_ID"),
  redditClientSecret: required("REDDIT_CLIENT_SECRET"),
  redditUserAgent: required("REDDIT_USER_AGENT") || "web:sanctum-community:v1.0 (by /u/unknown)",
  cacheSeconds: number("REDDIT_CACHE_SECONDS", 1800),
  get subreddits() {
    return subreddits();
  }
};
