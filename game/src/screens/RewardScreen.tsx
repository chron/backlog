import type { DispatchProps, RunProps } from "../app/types";
import { GameCard } from "../components/GameCard";
import { getCard } from "../domain/content";

type RewardScreenProps = DispatchProps & RunProps;

export function RewardScreen({ dispatch, run }: RewardScreenProps) {
  const reward = run?.pendingCardReward;
  if (!reward) return null;

  return (
    <section className="screen reward-screen" aria-labelledby="reward-heading">
      <h1 id="reward-heading" className="reward-screen__title">
        REWARD
      </h1>

      <div className="reward-fan" aria-label="Card reward">
        {reward.cardIds.map((cardId, index) => {
          const card = getCard(cardId);
          return (
            <div
              className="reward-card"
              key={cardId}
              style={{ "--reward-index": index } as React.CSSProperties}
            >
              <GameCard
                instance={{ cardId, instanceId: `reward-${cardId}` }}
                effectiveCost={card.cost}
                selected={false}
                onSelect={() => dispatch({ type: "CHOOSE_CARD_REWARD", cardId })}
              />
            </div>
          );
        })}
      </div>

      <div className="reward-screen__actions">
        <button
          className="button button--text reward-skip"
          type="button"
          onClick={() => dispatch({ type: "SKIP_CARD_REWARD" })}
        >
          Skip
        </button>
      </div>
    </section>
  );
}
