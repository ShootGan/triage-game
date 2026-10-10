import { createRoot } from 'react-dom/client';
import App from './App';
import { setDeps, type GameDeps } from './game/deps';
import './ui/styles.css';

const root = createRoot(document.getElementById('root')!);
const useStub = new URLSearchParams(window.location.search).has('stub');

// Dynamiczny import: w trybie `?stub` prawdziwe moduły (3D, scenariusz…) nie są w ogóle ładowane.
const load: Promise<GameDeps> = useStub
  ? import('./ui/dev/stubDeps').then((m) => m.stubDeps)
  : import('./game/realDeps').then((m) => m.realDeps);

load.then(
  (deps) => {
    setDeps(deps);
    root.render(<App />);
  },
  (err: unknown) => {
    console.error(err);
    root.render(
      <div className="fatal">
        <h1>Błąd ładowania modułów gry</h1>
        <pre>{String(err)}</pre>
        <p>
          Tryb deweloperski z atrapami: <a href="?stub">?stub</a>
        </p>
      </div>,
    );
  },
);
