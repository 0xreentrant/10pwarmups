# A4 Train Mode: Knee on Belly → Under Jack Skip

## Symptom

In A4 train mode, after **Reverse Knee on Belly** the next asked move was **Under Jack**. **Wheel Kick Mount** never appeared.

Expected sequence:

**Reverse Knee on Belly → Wheel Kick Mount → Under Jack**

## How train picks the next move

Train does not quiz every name in the deck list. It only includes moves with a finite start time in `MOVE_TIMESTAMPS` (`src/data/moveTimestamps.ts`).

- Tagged time → included in `playableMoveIndices` / quiz order
- `null` (“not tagged yet”) → skipped

Reveal clips use the same rule: a move plays from its start until the **next tagged** start. If Wheel Kick is `null`, Reverse Knee on Belly’s reveal runs all the way to Under Jack’s timestamp. The video plays through wheel-kick footage while the quiz has already advanced to Under Jack.

## What was wrong on A4

The deck list had an extra move between Wheel Kick and Under Jack:

1. Reverse Knee on Belly (tagged)
2. Wheel Kick Mount (was `null` at one point; later tagged ~13.94s)
3. **Skydive** (`null` - never tagged)
4. Under Jack (tagged)

Sibling decks (e.g. C1 / F2) use **kob → wheel kick → under jacks** with no Skydive in between. On A4, the untagged Skydive slot sat in that gap. Whenever Wheel Kick was missing from the playable set, order collapsed to:

**kob → under jack**

## Tagger preview mismatch

Tagger Train had a second issue: quiz order came from the **saved** `MOVE_TIMESTAMPS` file, while the video used **in-editor** timestamps. If those disagreed (Wheel Kick tagged in the UI but still `null` on disk), Train could skip Wheel Kick even though Edit showed a time.

## Fixes

1. **Removed Skydive** from A4 in `src/data/decks.ts` so the list matches the real sequence.
2. **Aligned A4 timestamps** in `src/data/moveTimestamps.ts` (move count and tag array stay in sync).
3. **Tagger Train** passes live editor timestamps into `START_PREVIEW` so quiz order matches the tags you see in Edit (`src/appMachine.ts`, `src/components/tagger/TaggerView.tsx`).
4. **Regression tests** in `src/data/moveTimestamps.test.ts` assert kob → wheel kick → under jack stay consecutive when tagged.

## How to verify

1. Open `/tagger/A4/edit` and confirm the list is kob → Wheel Kick Mount → Under Jack (no Skydive).
2. Switch to **Train**, answer through Reverse Knee on Belly.
3. Next ask should be **Wheel Kick Mount**, then **Under Jack**.
