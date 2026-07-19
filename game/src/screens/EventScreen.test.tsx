import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { gameReducer, initialGameState } from "../game/gameReducer";
import { EventScreen } from "./EventScreen";
import { MapScreen } from "./MapScreen";

function testRun() {
  const state = gameReducer(initialGameState, { type: "START_RUN", seed: 0xe7e17 });
  if (!state.run) throw new Error("Expected a run");
  return state.run;
}

describe("EventScreen", () => {
  it("renders definition copy and exact dynamic outcome chips", () => {
    const markup = renderToStaticMarkup(
      <EventScreen
        dispatch={() => undefined}
        run={{ ...testRun(), morale: 9 }}
        eventId="scope-creep"
        onInspectDeck={() => undefined}
      />,
    );

    expect(markup).toContain("Scope Creep");
    expect(markup).toContain("It&#x27;s only one tiny thing");
    expect(markup).toContain("+1 Morale");
    expect(markup).toContain("+35 Credits");
    expect(markup).toContain("+3 Tech Debt");
  });

  it("keeps conditional and deferred choices visible with their reason", () => {
    const markup = renderToStaticMarkup(
      <EventScreen
        dispatch={() => undefined}
        run={{ ...testRun(), credits: 10 }}
        eventId="karaoke-night"
        onInspectDeck={() => undefined}
      />,
    );

    expect(markup).toContain("Duet");
    expect(markup).toContain("−15 Credits");
    expect(markup).toContain("Duplicate 1 non-Rare");
    expect(markup).toContain("Need 15 Credits");
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>.*Duet/s);
  });

  it("keeps authored Event titles hidden on the map", () => {
    const markup = renderToStaticMarkup(
      <MapScreen dispatch={() => undefined} run={testRun()} onInspectDeck={() => undefined} />,
    );

    expect(markup).not.toContain("Scope Creep");
    expect(markup).not.toContain("One Tiny Thing");
    expect(markup).not.toContain("Ship It Friday");
    expect(markup).toContain("Event, Locked");
  });
});
