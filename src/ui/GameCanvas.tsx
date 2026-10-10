import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { getDeps } from '../game/deps';
import { attachView, useGame } from '../game/store';
import type { IGameView } from '../render/types';
import type { Scenario } from '../scenarios/types';

const GameViewContext = createContext<IGameView | null>(null);

/** Widok 3D (null, dopóki nie powstał). */
export function useGameView(): IGameView | null {
  return useContext(GameViewContext);
}

/**
 * Canvas na cały ekran za interfejsem. Tworzy IGameView przy montowaniu,
 * zwalnia przy odmontowaniu; udostępnia widok dzieciom przez kontekst.
 */
export function GameCanvas({ scenario, children }: { scenario: Scenario; children?: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState<IGameView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let v: IGameView;
    try {
      v = getDeps().createGameView(canvas, scenario);
    } catch (e) {
      console.error(e);
      setError(String(e));
      return;
    }
    v.onPatientClick((id) => useGame.getState().selectPatient(id));
    attachView(v);
    setView(v);
    return () => {
      attachView(null);
      setView(null);
      v.dispose();
    };
  }, [scenario]);

  return (
    <div className="stage">
      <canvas ref={canvasRef} className="game-canvas" />
      {error && <div className="fatal small">Błąd widoku 3D: {error}</div>}
      <GameViewContext.Provider value={view}>{children}</GameViewContext.Provider>
    </div>
  );
}
