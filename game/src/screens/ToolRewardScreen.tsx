import type { DispatchProps, RunProps } from "../app/types";
import { getTool } from "../domain/content";

type ToolRewardScreenProps = DispatchProps & RunProps;

export function ToolRewardScreen({ dispatch, run }: ToolRewardScreenProps) {
  const reward = run?.pendingToolReward;
  if (!reward) return null;

  return (
    <section
      className="screen reward-screen tool-reward-screen"
      aria-labelledby="tool-reward-heading"
    >
      <h1 id="tool-reward-heading" className="reward-screen__title">
        TOOL UP
      </h1>

      <div className="tool-reward-fan" aria-label="Choose a Tool">
        {reward.toolIds.map((toolId, index) => {
          const tool = getTool(toolId);
          return (
            <button
              className="tool-reward"
              type="button"
              key={tool.id}
              style={{ "--reward-index": index } as React.CSSProperties}
              onClick={() => dispatch({ type: "CHOOSE_TOOL_REWARD", toolId })}
            >
              <span className="tool-reward__hardware" aria-hidden="true">
                <i />
                <b>{tool.symbol}</b>
                <i />
              </span>
              <strong>{tool.name}</strong>
              <span>{tool.rules}</span>
              <small>Install</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
