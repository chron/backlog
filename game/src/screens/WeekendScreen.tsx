import { ArrowLeft, Briefcase, Coffee, GitPullRequest, Sparkles } from "lucide-react";
import { useState } from "react";
import panelMascot from "../assets/mascots/panel.svg";
import platformMascot from "../assets/mascots/platform.svg";
import researchMascot from "../assets/mascots/research.svg";
import type { DispatchProps, RunProps } from "../app/types";
import { CardCollectionBrowser, CardCollectionEntry } from "../components/CardCollectionBrowser";
import { CharacterPortrait } from "../components/CharacterPortrait";
import { GameCard } from "../components/GameCard";
import { getCard } from "../domain/content";
import { canRefactorCard } from "../domain/shop";
import {
  getWeekendChoiceState,
  getWeekendSquadDraftCardIds,
  isFinalWeekend,
  type WeekendChoiceId,
} from "../domain/weekend";

type WeekendScreenProps = DispatchProps &
  RunProps & {
    nodeId: string;
    onInspectDeck: () => void;
  };

const weekendChoices = [
  {
    id: "rest",
    label: "Rest",
    note: "Actually log off.",
    icon: Coffee,
    mascot: panelMascot,
  },
  {
    id: "refactor",
    label: "Refactor",
    note: "Tidy one loose end.",
    icon: GitPullRequest,
    mascot: platformMascot,
  },
  {
    id: "side-gig",
    label: "Side Gig",
    note: "Relax with different work.",
    icon: Briefcase,
    mascot: researchMascot,
  },
] as const;

export function WeekendScreen({ dispatch, run, nodeId, onInspectDeck }: WeekendScreenProps) {
  const [refactoring, setRefactoring] = useState(false);
  const [drafting, setDrafting] = useState(false);
  if (!run) return null;

  const choices = isFinalWeekend(nodeId)
    ? [
        ...weekendChoices,
        {
          id: "squad-draft" as const,
          label: "One Last PR",
          note: "Sneak in one final idea.",
          icon: Sparkles,
        },
      ]
    : weekendChoices;
  const draftCardIds = getWeekendSquadDraftCardIds(run, nodeId);

  function choose(choiceId: WeekendChoiceId) {
    if (choiceId === "refactor") {
      setRefactoring(true);
      return;
    }
    if (choiceId === "squad-draft") {
      setDrafting(true);
      return;
    }
    dispatch({ type: "CHOOSE_WEEKEND", choiceId });
  }

  return (
    <section
      className={`screen weekend-screen${drafting ? " is-drafting" : ""}`}
      aria-labelledby="weekend-heading"
    >
      <header className="weekend-heading">
        <div>
          <span>Out of office</span>
          <h1 id="weekend-heading">WEEKEND</h1>
        </div>
        <CardCollectionEntry count={run.deck.length} onOpen={onInspectDeck} />
      </header>

      <div className="weekend-calendar" aria-hidden="true">
        <span>Sat</span>
        <b>Do</b>
        <strong>Nothing?</strong>
        <i>Sun</i>
      </div>

      {drafting ? (
        <div className="weekend-draft" aria-label="One Last PR card draft">
          <div className="weekend-draft__intro">
            <Sparkles aria-hidden="true" strokeWidth={3} />
            <strong>ONE LAST PR</strong>
            <span>Costs 2 Morale</span>
            <button
              className="button button--text weekend-draft__back"
              type="button"
              onClick={() => setDrafting(false)}
            >
              <ArrowLeft aria-hidden="true" strokeWidth={3} />
              Back
            </button>
          </div>
          <div className="weekend-draft__cards">
            {draftCardIds.map((cardId, index) => {
              const card = getCard(cardId);
              return (
                <div
                  className="weekend-draft__card"
                  key={cardId}
                  style={{ "--draft-index": index } as React.CSSProperties}
                >
                  <GameCard
                    instance={{ cardId, instanceId: `weekend-draft-${cardId}` }}
                    effectiveCost={card.cost}
                    selected={false}
                    onSelect={() =>
                      dispatch({ type: "CHOOSE_WEEKEND", choiceId: "squad-draft", cardId })
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          className={`weekend-choice-grid${choices.length === 4 ? " has-final-choice" : ""}`}
          aria-label="Weekend plans"
        >
          {choices.map((choice, index) => {
            const state = getWeekendChoiceState(choice.id, run, nodeId);
            const Icon = choice.icon;
            return (
              <button
                className={`weekend-choice weekend-choice--${choice.id}`}
                type="button"
                key={choice.id}
                disabled={Boolean(state.disabledReason)}
                onClick={() => choose(choice.id)}
              >
                <span className="weekend-choice__number">0{index + 1}</span>
                <Icon className="weekend-choice__icon" aria-hidden="true" strokeWidth={3} />
                <span className="weekend-choice__copy">
                  <strong>{choice.label}</strong>
                  <small>{state.disabledReason ?? choice.note}</small>
                </span>
                <span className="weekend-choice__outcomes">
                  {state.outcomes.map((outcome) => (
                    <b key={outcome}>{outcome}</b>
                  ))}
                </span>
                {"mascot" in choice ? (
                  <img src={choice.mascot} alt="" draggable={false} />
                ) : (
                  <span className="weekend-choice__squad" aria-hidden="true">
                    {run.squad.map((developerId) => (
                      <span className="weekend-choice__squad-member" key={developerId}>
                        <CharacterPortrait developerId={developerId} mode="token" decorative />
                      </span>
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {refactoring && (
        <CardCollectionBrowser
          cards={run.deck}
          title="Weekend Refactor"
          mode="choose-one"
          confirmLabel="Remove"
          canChoose={(instance) => canRefactorCard(run, instance)}
          onChoose={(instanceId) =>
            dispatch({ type: "CHOOSE_WEEKEND", choiceId: "refactor", instanceId })
          }
          onClose={() => setRefactoring(false)}
        />
      )}
    </section>
  );
}
