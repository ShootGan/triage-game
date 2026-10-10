import { useGame } from './game/store';
import { BriefingOverlay } from './ui/Briefing';
import { DebriefScreen } from './ui/Debrief';
import { GameCanvas } from './ui/GameCanvas';
import { MenuScreen } from './ui/Menu';
import { PlayingUI } from './ui/PlayingUI';

export default function App() {
  const phase = useGame((s) => s.phase);
  const scenario = useGame((s) => s.scenario);

  return (
    <div className="app">
      {phase === 'menu' && <MenuScreen />}
      {(phase === 'briefing' || phase === 'playing') && scenario && (
        <GameCanvas scenario={scenario}>
          {phase === 'briefing' ? <BriefingOverlay /> : <PlayingUI />}
        </GameCanvas>
      )}
      {phase === 'debrief' && <DebriefScreen />}
    </div>
  );
}
