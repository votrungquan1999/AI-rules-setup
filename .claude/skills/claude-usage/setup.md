# Installing claude-usage on a machine that lacks it

The report needs a checkout of the tool linked at `~/.claude/claude-usage`. This page installs it with the status line and cross-machine sync turned on. The checkout's `README.md` is the full reference; this page is the order to run it in.

**Confirm with the operator before step 3.** Tell them what the install changes:

- `~/.claude/settings.json`: the status line is replaced (any existing one is lost) and two hooks are added (`UserPromptSubmit`, `SessionStart`). A dated backup is saved next to the file first.
- Sync uploads per-message token counts (never transcripts) to `https://claude-usage.quanvo.dev`. The backfill in step 4b uploads this machine's whole history at once.

## 1. Check prerequisites

- `node --version` must be 22 or newer, and `git` must be installed. If either is missing, stop and say which.
- There is no `npm install` or build step: the report, status line, sync and backfill use only Node builtins.

## 2. Find or clone the checkout

Look for an existing clone, and for the `personal-infra` checkout that step 3 reads the secret from:

```sh
find "$HOME" -maxdepth 6 \( -path "$HOME/Library" -o -name node_modules -o -name .git \) -prune -o -type f \( -path '*/claude-usage/scripts/install.mjs' -o -path '*/personal-infra/Pulumi.yaml' \) -print 2>/dev/null
```

If no claude-usage clone turns up, clone one next to the operator's other repositories (confirm the folder with them):

```sh
git clone https://github.com/votrungquan1999/claude-usage.git <parent-dir>/claude-usage
```

Never clone into `~/.claude/claude-usage` itself. The installer deletes that path and puts a symlink there, so it would delete the clone it runs from and leave a link pointing at itself.

## 3. Install with sync on

Sync needs the shared secret that is already deployed. **Never generate a new one**: the server rejects it with 401 while every command still reports success. The secret comes from Pulumi, which needs the `personal-infra` checkout, a `PULUMI_ACCESS_TOKEN=` line in its `.env`, and the `pulumi` CLI. Check both before running anything; if either is missing, go to [When the secret is unavailable](#when-the-secret-is-unavailable):

```sh
grep -q '^PULUMI_ACCESS_TOKEN=.' <personal-infra checkout>/.env && command -v pulumi
```

Run this as one command. The secret then goes straight from Pulumi into the installer and never shows up in output, in an argument list, or in this transcript:

```sh
INFRA=<personal-infra checkout>
CLAUDE_USAGE_SECRET="$(cd "$INFRA" && PULUMI_ACCESS_TOKEN="$(grep '^PULUMI_ACCESS_TOKEN=' .env | cut -d= -f2-)" pulumi stack output claudeUsageSecret --show-secrets --stack votrungquan1999/prod --non-interactive)" \
  node <claude-usage checkout>/scripts/install.mjs --api-url https://claude-usage.quanvo.dev
```

- **Keep the token export.** Without `PULUMI_ACCESS_TOKEN`, `pulumi` waits for an interactive login and the command hangs.
- **Keep `--stack votrungquan1999/prod`.** A fresh machine has no stack selected, and a plain `prod` fails with "no stack named 'prod' found".
- **Never `echo` the secret, `cat` the `.env`, or pass `--secret <value>`.** Each of these writes the secret into the transcript or the process list.

Then read the installer's output:

- `Sync configured -> https://claude-usage.quanvo.dev` means the secret is in `~/.claude/claude-usage/.env`. Go to step 4.
- `Sync is NOT on yet` means Pulumi returned nothing. The report and status line are installed anyway. Follow the next section.

### When the secret is unavailable

This covers: no `personal-infra` checkout, no token in its `.env`, Pulumi errors, or the harness blocks the command. Do not work around it. Tell the operator that sync is off and offer two fixes:

- Put the Pulumi token in `personal-infra/.env` on this machine, then re-run step 3. Re-running the installer is safe.
- Fill in `~/.claude/claude-usage/.env` themselves, outside the chat, with `CLAUDE_USAGE_API_URL=https://claude-usage.quanvo.dev` and the `CLAUDE_USAGE_SECRET=` line copied from another machine's copy of the same file. Pasting the secret into the chat would put it in the transcript.

Once the `.env` has both lines, continue with step 4.

## 4. Verify, in this order

Each check alone proves nothing. Together they tell a wrong secret, a wrong URL and dropped events apart. `sent: 0` from a hook is never evidence, because all of these failures produce it.

**a. Auth and routing probe.** It writes nothing:

```sh
set -a; . ~/.claude/claude-usage/.env; set +a
curl -s -X POST "$CLAUDE_USAGE_API_URL/api/sync" -H "x-claude-usage-secret: $CLAUDE_USAGE_SECRET" -H 'Content-Type: application/json' -d '{"machineId":"probe","events":[]}'
```

You should get `{"accepted":0,"rejected":0}`. A 401 means the secret is wrong. HTML, a redirect or a 404 means the URL is wrong.

**b. Import this machine's history:** `node ~/.claude/claude-usage/bin/backfill.mjs`. In the summary line, `events sent` must be non-zero. If it is zero while transcripts exist, check that `~/.claude.json` has a `machineID`; sync skips a machine it cannot identify.

**c. Confirm the dashboard stored the events:**

```sh
MID=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(require("os").homedir()+"/.claude.json","utf8")).machineID)')
set -a; . ~/.claude/claude-usage/.env; set +a
curl -s -H "Cookie: session=$CLAUDE_USAGE_SECRET" "$CLAUDE_USAGE_API_URL/" | grep -o "${MID}[^}]*lastAccepted[^,]*" | grep -o 'lastAccepted.*' | tr -d '\\"' | head -1
```

You should see `lastAccepted:<time>` from the last few minutes. The dashboard shows UTC+7. No output means nothing was stored for this machine. Write `${MID}` with braces, because zsh reads `$MID[` as an array index.

**d. Check for stale paths:** run `grep -n claude-usage ~/.claude/settings.json`. Every path must start with this machine's `$HOME/.claude/claude-usage/`. An entry under another home directory (left over from a settings file copied from another machine) fails on every prompt, so remove it.

Then run the report from [SKILL.md](SKILL.md) again. Tell the operator the status line appears in the next new session.
