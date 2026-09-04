import { describe, expect, it } from "vitest"
import {
  taggerKeyDownAction,
  taggerKeyUpShouldSuppress,
} from "../src/components/tagger/taggerKeyboard"

function key(
  overrides: Partial<Parameters<typeof taggerKeyDownAction>[0]> = {},
): Parameters<typeof taggerKeyDownAction>[0] {
  return {
    target: "default",
    code: "",
    key: "",
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    nudgeSec: 0.05,
    jsonPastLength: 0,
    jsonFutureLength: 0,
    ...overrides,
  }
}

describe("taggerKeyDownAction", () => {
  it("scrubs on arrow keys when focus is not in an editor", () => {
    expect(taggerKeyDownAction(key({ code: "ArrowLeft", key: "ArrowLeft" }))).toEqual({
      type: "scrub",
      deltaSec: -0.05,
    })
    expect(taggerKeyDownAction(key({ code: "ArrowRight", key: "ArrowRight" }))).toEqual({
      type: "scrub",
      deltaSec: 0.05,
    })
  })

  it("ignores arrow keys and space in the json editor", () => {
    expect(
      taggerKeyDownAction(key({ target: "json-editor", code: "ArrowLeft", key: "ArrowLeft" })),
    ).toEqual({ type: "ignore" })
    expect(
      taggerKeyDownAction(key({ target: "json-editor", code: "ArrowRight", key: "ArrowRight" })),
    ).toEqual({ type: "ignore" })
    expect(taggerKeyDownAction(key({ target: "json-editor", code: "Space", key: " " }))).toEqual({
      type: "ignore",
    })
  })

  it("ignores player shortcuts in other typing fields", () => {
    expect(
      taggerKeyDownAction(key({ target: "other-typing", code: "Space", key: " " })),
    ).toEqual({ type: "ignore" })
  })

  it("toggles playback on space outside editors", () => {
    expect(taggerKeyDownAction(key({ code: "Space", key: " " }))).toEqual({
      type: "toggle-playback",
    })
  })

  it("seeks to start on Home outside editors", () => {
    expect(taggerKeyDownAction(key({ code: "Home", key: "Home" }))).toEqual({
      type: "seek-start",
    })
  })

  it("ignores Home in the json editor", () => {
    expect(
      taggerKeyDownAction(key({ target: "json-editor", code: "Home", key: "Home" })),
    ).toEqual({ type: "ignore" })
  })

  it("deletes selected marker on Delete or Backspace outside editors", () => {
    expect(taggerKeyDownAction(key({ code: "Delete", key: "Delete" }))).toEqual({
      type: "delete-marker",
    })
    expect(taggerKeyDownAction(key({ code: "Backspace", key: "Backspace" }))).toEqual({
      type: "delete-marker",
    })
  })

  it("undoes json history from the json editor when past is non-empty", () => {
    expect(
      taggerKeyDownAction(
        key({
          target: "json-editor",
          code: "KeyZ",
          key: "z",
          metaKey: true,
          jsonPastLength: 2,
        }),
      ),
    ).toEqual({ type: "undo" })
  })

  it("does not undo from the json editor when past is empty", () => {
    expect(
      taggerKeyDownAction(
        key({
          target: "json-editor",
          code: "KeyZ",
          key: "z",
          metaKey: true,
          jsonPastLength: 0,
        }),
      ),
    ).toEqual({ type: "ignore" })
  })

  it("redoes json history from the json editor when future is non-empty", () => {
    expect(
      taggerKeyDownAction(
        key({
          target: "json-editor",
          code: "KeyZ",
          key: "z",
          metaKey: true,
          shiftKey: true,
          jsonFutureLength: 1,
        }),
      ),
    ).toEqual({ type: "redo" })
  })
})

describe("taggerKeyUpShouldSuppress", () => {
  it("does not suppress keyup while typing in text fields", () => {
    expect(taggerKeyUpShouldSuppress("json-editor", "Space", " ")).toBe(false)
    expect(taggerKeyUpShouldSuppress("other-typing", "ArrowLeft", "ArrowLeft")).toBe(false)
  })

  it("suppresses player keyup outside text fields", () => {
    expect(taggerKeyUpShouldSuppress("default", "Space", " ")).toBe(true)
    expect(taggerKeyUpShouldSuppress("default", "ArrowRight", "ArrowRight")).toBe(true)
    expect(taggerKeyUpShouldSuppress("default", "Home", "Home")).toBe(true)
  })
})
