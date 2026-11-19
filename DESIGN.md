# DESIGN.md

Locked decisions from the design conversation. Numbers are placeholders — tune after playtest.

## Core loop
- `$answer` → shows a question
- `$submit <answer>` → +3 energy on correct
- Spend energy on actions. 1 per command, except `$harden` (2 java / 6 powershell).
- Win: most net worth (cash + coins) at round N.

## Shells

| | bash | powershell | java |
|---|---|---|---|
| username | custom (hidden) | `user` | `admin` |
| storage | Argon2id | bcrypt | unsalted MD5 |
| lockout | 2 | 5 | 10 |
| coverage | narrow | broad | moderate |
| harden | — (maxed) | 6 → Argon2 | 2 → bcrypt |
| unique | sees attack log | broadest toolkit | cheapest offense |

## Error strings (verbatim)
- `No such user exists`
- `Wrong Password`
- `Welcome`

## Steal caps
- java 10% · powershell 15% · bash 25%
- Diminishing per attacker–victim pair: 100% → 60% → 35% → 20%

## Defaults
- Energy per answer: 3
- Passive income: 25/round
- Machine: 10 energy · Cloud: 5
- Game length: 15 rounds · Tick: 2s
- Steal cap default: 10% (java)

## Vertical slice (current)
- One target (`bot`), one shell (java), one injection target
- Supported injection: `admin' OR 1=1 --`
- No economy, no graph, no scripts, no multi-machine
