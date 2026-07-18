import type { DispatchProps, RunProps } from "../app/types";
import { CardCollectionEntry } from "../components/CardCollectionBrowser";

type ShopScreenProps = DispatchProps &
  RunProps & {
    onInspectDeck: () => void;
  };

export function ShopScreen({ dispatch, run, onInspectDeck }: ShopScreenProps) {
  return (
    <section className="screen" aria-labelledby="shop-heading">
      <div className="screen-heading">
        <h1 id="shop-heading" className="display-title">
          TOOL SHOP
        </h1>
        <div className="collection-entry-group">
          <span>${run?.credits ?? 0}</span>
          <CardCollectionEntry count={run?.deck.length ?? 0} onOpen={onInspectDeck} />
        </div>
      </div>

      <div className="shop-shelf">
        <button className="shop-item" type="button" disabled>
          <strong>Green Check</strong>
          <span>Passive tool</span>
          <small>$80</small>
        </button>
        <button className="shop-item" type="button" disabled>
          <strong>Thin Deck</strong>
          <span>Remove a card</span>
          <small>$60</small>
        </button>
      </div>

      <div className="screen-actions">
        <button
          className="button button--secondary"
          type="button"
          onClick={() => dispatch({ type: "LEAVE_NODE" })}
        >
          Leave
        </button>
      </div>
    </section>
  );
}
