import { POINTS } from '../engine/scoring';

const pts = (n: number) => (n > 0 ? `${n} pkt` : n < 0 ? `−${-n} pkt` : '0 pkt');

/** Game rules and scoring, in plain language. Values come from the scoring engine. */
export function HowToScreen({ onClose }: { onClose: () => void }) {
  return (
    <div className="panel menu-panel about intro">
      <div className="about-head">
        <h1 className="title">Jak grać</h1>
        <button className="btn" onClick={onClose} autoFocus>
          ◂ Menu
        </button>
      </div>

      <h2 className="h-small">Cel</h2>
      <p>Oznacz kolorem wszystkich poszkodowanych zgodnie z algorytmem — jak najtrafniej.</p>

      <h2 className="h-small">Przebieg</h2>
      <ol className="about-list intro-list">
        <li>
          W menu wybierz tryb, algorytm i scenariusz. <strong>Nauka</strong> — z podpowiedzią algorytmu (klawisz H), bez
          limitu czasu. <strong>Ćwiczenie</strong> — bez podpowiedzi, z limitem czasu.
        </li>
        <li>Wysłuchaj odprawy dyspozytora i wjedź na miejsce.</li>
        <li>
          Wydaj komendę „Kto może chodzić — do mnie!” — chodzący przejdą na punkt zbiórki. Dalej zależy od algorytmu:
          <ul className="howto-sub">
            <li>
              <strong>START / JumpSTART</strong> — oznacz całą grupę chodzących jako ZIELONYCH i badaj resztę.
            </li>
            <li>
              <strong>SALT</strong> — wydaj drugą komendę „Kto mnie słyszy — pomachaj!”. Oceniaj w kolejności:
              nieruchomi, machający, a chodzący na końcu — każdy osobno.
            </li>
          </ul>
        </li>
        <li>
          Kliknij poszkodowanego i badaj go: oddech, drogi oddechowe, tętno, polecenia… Każda czynność pokazuje wynik.
        </li>
        <li>Nadaj kolor (klawisze 1–5) i przejdź do następnego.</li>
        <li>
          „Zakończ segregację” — w podsumowaniu widać punkty i przy każdym poszkodowanym, co było dobrze, co źle
          i dlaczego.
        </li>
      </ol>

      <h2 className="h-small">Punktacja</h2>
      <p>Za każdego poszkodowanego maksymalnie {pts(POINTS.correct)}:</p>
      <ul className="about-list intro-list">
        <li>trafny kolor, potwierdzony badaniem — {pts(POINTS.correct)}</li>
        <li>trafny kolor, ale bez badania, które go rozstrzyga („na ślepo”) — {pts(POINTS.guessed)}</li>
        <li>
          kolor zawyżony, np. ŻÓŁTY zamiast ZIELONEGO — {pts(POINTS.over)}; kolor osoby żyjącej u zmarłego —{' '}
          {pts(POINTS.overDead)}
        </li>
        <li>kolor zaniżony albo brak koloru — {pts(POINTS.under)}</li>
        <li>
          <strong>błąd krytyczny</strong>: CZARNY lub SZARY dla kogoś, kto ma szansę przeżyć — {pts(POINTS.critical)}
        </li>
        <li>
          pominięta czynność ratująca życie (tamowanie krwotoku, udrożnienie dróg oddechowych, oddechy ratownicze,
          odbarczenie odmy) — {pts(POINTS.missedLifesaving)} za każdą
        </li>
        <li>SALT: ocena kogoś, gdy czekał jeszcze ktoś z pilniejszej grupy — {pts(POINTS.sortOrder)}</li>
      </ul>
      <p className="muted">
        Czas jest mierzony, ale nie wpływa na wynik. U dziecka 9–12 lat zaliczany jest kolor zarówno wg START, jak
        i JumpSTART.
      </p>

      <h2 className="h-small">Kody zadań</h2>
      <p>
        Każda rozgrywka ma kod, np. KAMIENICA-4F7K. Wpisz go w menu, żeby zagrać dokładnie tę samą sytuację — np. drugi
        raz albo z kimś innym, żeby porównać wyniki. Sytuacja <strong>Wzorzec</strong> to stały, ręcznie ułożony zestaw
        poszkodowanych.
      </p>
    </div>
  );
}
