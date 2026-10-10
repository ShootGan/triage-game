import { ExamPanel } from './ExamPanel';
import { HintPanel } from './HintPanel';
import { Hud } from './Hud';
import { TriageMarkers } from './TriageMarkers';

export function PlayingUI() {
  return (
    <>
      <TriageMarkers />
      <div className="play-layout">
        <Hud />
        <div className="play-body">
          <HintPanel />
          <ExamPanel />
        </div>
      </div>
    </>
  );
}
