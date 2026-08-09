# PlayNext V2

A mobile-first realtime winner-stays football queue manager.

## Core rules
- Maximum match length: configurable, default 10 minutes.
- First goal wins immediately, regardless of elapsed time.
- Winner stays on the pitch.
- Loser moves to the back of the queue.
- If no goal is scored by full time, both teams rotate out.
- On a draw, the next two queued teams enter.
- Drawn teams join the back of the queue in their original order.
- Undo last completed result.
- Match history and queue waiting estimates.

## Realtime V2
- Host a live game and receive a 4-digit room code.
- Spectators join from their own phones with the room code.
- Host-only match controls.
- Live synchronized timer, current match and queue using Supabase Realtime.
- Installable PWA shell.

## Deployment
This is a static web app designed to deploy directly on Vercel.
