# Idle site suspension: spec (NOT BUILT, roadmap item)

Written 2026-10-13 (Web Claude) at Irfan's direction. **Decision: note it, do not build now.** Plain English.
Idea seen in Emergent: projects nobody visits go to sleep and wake when someone arrives, which saves hosting cost.

## 0. Why not now, and when
- No paying customers yet; hosting cost is not the problem yet; it adds moving parts (wake logic, timers, failure cases).
- **Build when:** more than about 500 live sites, OR hosting cost becomes a real line in the accounts, AND a paid tier exists
  (paid = always on, free = suspends when idle).

## 1. The finding that shapes the whole spec (read this first)
What can be suspended depends on what a "site" is. Checked in the code on 2026-10-13:

| Kind of site | How it runs today | Is there something to suspend? |
|---|---|---|
| Website Builder, **Launched** site (`<slug>.gurost.com`, `/sites/<slug>`) | A frozen copy of the HTML stored in the `published_sites` table, served by the one Gurost server (`lib/published-sites.js`). Cached 60 s. | **No.** No worker or container per site. An idle site costs a database row, not a running process. Suspension would save about nothing. |
| Website deployed to **Vercel** | Static or serverless hosting by Vercel | **Already sleeps by design** (pay for use). Nothing to build. |
| **App Builder backend** deployed to Render (+ Neon database) | One Render service per app, always on | **Yes. This is the real target.** Each is a running server that bills while idle. |
| Draft preview (sandbox link) | Rebuilt from the project on each request | No. |

So "suspend idle sites" really means "**suspend idle app backends**". Website Launch needs no suspension. This keeps the work small
and keeps the 24-hour free-tier rule meaningful where money is spent. (Not verified live: the Render/Neon deploy path has never been
run end to end by this team, see `docs/APP_BUILDER_STATUS.md`.)

## 2. What it does
- Detect an app backend with no visits for N hours.
- Suspend its Render service (Render supports suspending a service through its API; **verify the exact call and its billing effect
  in Render's current docs before building**, this is not checked yet).
- Keep everything else: the database record, the repo, the domain, the database (Neon has its own scale-to-zero; confirm per plan).
- The first visitor wakes it. About 2 to 5 seconds of delay on that one visit (**a guess**: a cold start of a Node service can be
  longer; measure on a real deploy before promising any number).
- After the wake it runs at full speed until idle again.

## 3. Thresholds
| Plan | Rule |
|---|---|
| Free | Suspend after 24 hours with no visits |
| Paid | Never suspend (always on) |
| Enterprise | Never suspend, plus an agreed uptime promise (SLA) |
The numbers are settings, not code constants (`IDLE_SUSPEND_HOURS_FREE`, default 24). "Visit" means a real request to the app's
public address, not our own health checks or the owner opening the dashboard (those would keep it awake for no reason).

## 4. Wake-up flow
1. Visitor opens the app's address.
2. A small always-on **front door** (on the Gurost server, or a Render-free static page) looks up the app: is it `suspended`?
3. If yes: show a short "waking up" page (no blank screen, no error), call Render to resume, record `waking`.
4. Poll the app's health address until it answers (give up after about 60 s and show an honest "this app is taking longer than
   usual, retry" page; never a raw error).
5. Redirect or proxy the visitor to the app. Record `running` and the time of the visit.
Edge cases to design for: many visitors at once (only one wake call, the rest wait), a wake that fails (stay `suspended`, tell the
owner), forms or webhooks sent to a sleeping app (**webhooks from Stripe or others will fail or time out while suspended**, so an app that
receives webhooks should be marked "keep awake" and that should be a paid feature).

## 5. SEO impact
- Search engines crawling a sleeping app wake it, and a slow first response can hurt ranking and the crawl budget.
- Mitigation: the public marketing site of a customer stays a **static Launched site** (always fast, always on, costs nothing extra
  as section 1 shows). Only the **app part** (logins, dashboards) sleeps. Crawlers should not be indexing those anyway.
- A suspended app answers crawlers from the front door with a cheap static page and a normal 200 or 503 with `Retry-After`
  (decide which when building; 503 with Retry-After is the standard way to say "come back shortly").

## 6. Cost math (fill in with real numbers when the time comes)
No cost figures are claimed here because none were checked. The model:

- Today: `cost_now = sites * price_always_on_per_month` (Render service price for the plan we use).
- After: `cost_after = active_sites * price_always_on + suspended_sites * price_suspended`
  where `active_sites = sites * share_visited_in_last_24h` and `price_suspended` is what Render charges for a suspended
  service (to be confirmed, it may not be zero; the database may also bill).
- **It pays off when** `sites * (1 - share_visited) * (price_always_on - price_suspended) > cost_of_building_and_running_it`
  (the build days, plus the front door server, plus support for "my app was slow").
- Data needed first: Render's current price list; how many deployed apps exist; how many were visited in the last 24 hours
  (needs the visit counter in section 7). **Do not guess `share_visited`: measure it.**

## 7. What would need building (when the time comes)
1. A visit counter per deployed app (last visited time), written cheaply, no personal data (the privacy policy must still be true).
2. A state field on the deployment record: `running | suspended | waking`.
3. A scheduled job (the same scheduler as the retention cleanup) that suspends free-plan apps idle past the threshold.
4. The front door and the "waking up" page.
5. Admin view: counts by state, last wake time, failures. Plan check (free vs paid) from the existing plan field.
6. Tests: threshold logic with a fake clock, the wake flow with a fake Render client, the paid plan never suspended.
7. Honest customer wording in the plan page: "Free apps sleep after 24 hours without visitors and wake in a few seconds."

## 8. Risks
- Wake failures look like outages to the customer's own customers; this is why paid = always on.
- A bug that suspends a paid app is worse than the savings. Test the plan rule first and log every suspend with the reason.
- Principle check: nothing here locks anyone in. A suspended app keeps its code and database; the owner can still take the repo and keys.

## 9. Not decided
Whether to also offer "keep awake" as an add-on for a free plan; the exact free-tier idle time (24 hours is Irfan's starting point);
whether Neon databases are suspended separately.
