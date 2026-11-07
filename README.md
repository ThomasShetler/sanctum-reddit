# Sanctum Reddit

Read-only directory of the public Reddit communities that belong to [Sanctum Hermeticum](https://sanctumhermeticum.org/).

This service exists so the Community page at [https://sanctumhermeticum.org/community/](https://sanctumhermeticum.org/community/) can show each subreddit’s public name, description, icon, subscriber count, and a Join link. Subscribe still happens on Reddit. The app does not post, comment, vote, message users, or store user content.

Azure DevOps is the working copy (`Sanctum Network` / `Sanctum Reddit`). This GitHub repository is the public `main` remote for Reddit’s Data API review.

## What it calls

Application-only OAuth, then the public subreddit object:

1. `POST https://www.reddit.com/api/v1/access_token` with `grant_type=client_credentials`
2. `GET https://oauth.reddit.com/r/{subreddit}/about` for names in `REDDIT_SUBREDDITS`

Fields used from `/about`: `display_name`, `title`, `public_description`, `subscribers`, `active_user_count`, `community_icon` / `icon_img`, `url`.

Responses are cached (default 30 minutes). Volume is one `/about` request per allowlisted subreddit per cache window.

## Why not Devvit

Devvit runs inside Reddit. This listing has to appear on our website next to the Discord server card. Devvit Web cannot be embedded on a third-party origin, and its client cannot call our domain.

## HTTP

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Process check. Does not call Reddit. |
| `GET` | `/communities` | Allowlisted subreddits, as public metadata. |
| `GET` | `/communities/{name}` | One allowlisted subreddit. Unknown names 404. |

Join URLs are ordinary links to `https://www.reddit.com/r/{name}/`.

## Run locally

Node 22+. Copy `.env.example` to `.env`, fill the Reddit app id/secret, User-Agent, and subreddit allowlist, then:

```bash
npm test
npm start
```

Credentials stay in the environment. They are not in this repository.

## Responsible use

- Scope: read metadata for communities we operate.
- No listings of posts or comments.
- No user profiles or personal data.
- No AI training corpus.
- Deleted or private subreddits are dropped from the page.
