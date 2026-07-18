import { getTool } from "../domain/content";
import type { ToolId } from "../domain/models";

interface ToolRackProps {
  toolIds: readonly ToolId[];
}

export function ToolRack({ toolIds }: ToolRackProps) {
  if (toolIds.length === 0) return null;

  return (
    <div className="tool-rack" aria-label="Tools">
      {toolIds.map((toolId) => {
        const tool = getTool(toolId);
        return (
          <button className="tool-chip" type="button" key={tool.id} aria-label={tool.name}>
            <span aria-hidden="true">{tool.symbol}</span>
            <span className="game-tooltip" role="tooltip">
              <strong>{tool.name}</strong>
              <span>{tool.rules}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
