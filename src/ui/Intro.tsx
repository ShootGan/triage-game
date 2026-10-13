import type { ExamActionId } from '../engine/exam/types';
import { AlgorithmFlow, JUMPSTART_FLOW, SALT_FLOW, START_FLOW } from './AlgorithmFlow';
import { Term } from './Term';

const NONE = new Set<ExamActionId>();

/** Plain-language intro for people who have never heard of triage. Opened from the menu. */
export function IntroScreen({ onClose, onAbout }: { onClose: () => void; onAbout: () => void }) {
  return (
    <div className="panel menu-panel about intro">
      <div className="about-head">
        <h1 className="title">Segregacja</h1>
        <button className="btn" onClick={onClose} autoFocus>
          ◂ Menu
        </button>
      </div>

      <h2 className="h-small">Co to jest?</h2>
      <p>
        W przypadku zdarzeń, w których poszkodowanych jest więcej, nie da się pomóc wszystkim naraz. Trzeba szybko
        ocenić, którzy z nich wymagają natychmiastowej pomocy, którzy mogą poczekać, którym właściwie nic poważnego nie
        jest i — niestety — których uratować się już nie da. To właśnie jest <strong>segregacja medyczna</strong> (ang.
        triage).
      </p>

      <h2 className="h-small">Po co?</h2>
      <p>
        Żeby uratować jak najwięcej osób. Gdyby ratownik zajmował się po kolei tym, kto stoi najbliżej albo najgłośniej
        woła, mógłby nie zdążyć do kogoś, kto cicho się wykrwawia albo dusi. Segregacja nie mówi, kto jest ważniejszy
        — mówi, komu pomoc jest potrzebna najpilniej.
      </p>

      <h2 className="h-small">Kolory</h2>
      <ul className="intro-cats">
        <li>
          <span className="flow-out flow-out-red">CZERWONY</span> zagrożenie życia — wymaga pomocy i transportu jak najszybciej
        </li>
        <li>
          <span className="flow-out flow-out-yellow">ŻÓŁTY</span> poważnie ranny, ale stan pozwala chwilę poczekać
        </li>
        <li>
          <span className="flow-out flow-out-green">ZIELONY</span> lekko ranny albo bez obrażeń, przemieszcza się samodzielnie
        </li>
        <li>
          <span className="flow-out flow-out-black">CZARNY</span> nie żyje albo nie oddycha mimo udrożnienia dróg oddechowych
        </li>
        <li>
          <span className="flow-out flow-out-grey">SZARY</span> (tylko SALT) żyje, ale przy dostępnych siłach i środkach
          nie ma szans na przeżycie
        </li>
      </ul>

      <h2 className="h-small">Jak to wygląda?</h2>
      <p>
        Ocena jednej osoby trwa zwykle krócej niż minutę. Ratownik sprawdza, w zależności od algorytmu, takie rzeczy
        jak: czy poszkodowany chodzi, czy oddycha i jak szybko, czy ma tętno, czy wykonuje polecenia. Wykonuje tylko czynności potrzebne
        natychmiast — np. zakłada stazę, żeby zatamować krwotok, albo udrażnia drogi oddechowe — oznacza
        poszkodowanego kolorem i idzie dalej. Potem zwykle przeprowadza się ponowną segregację, bo stan poszkodowanych się zmienia.
      </p>

      <h2 className="h-small">Algorytmy</h2>
      <p>
        Segregacja wywodzi się z medycyny wojennej — za jej ojca uważa się Dominique’a Larreya, chirurga armii
        Napoleona. Dziś ratownicy korzystają z prostych algorytmów, dzięki którym każdy ocenia poszkodowanych tak samo.
        W grze są trzy:
      </p>

      <section className="intro-algo">
        <h3 className="intro-algo-name">START · dorośli</h3>
        <p>
          Powstał w 1983 r. w Kalifornii. Ocenia cztery rzeczy: czy poszkodowany chodzi, jak oddycha, krążenie i czy
          wykonuje polecenia. Kto chodzi — od razu ZIELONY.
        </p>
        <details className="intro-flow">
          <summary>Schemat START</summary>
          <AlgorithmFlow flow={START_FLOW} done={NONE} />
        </details>
      </section>

      <section className="intro-algo">
        <h3 className="intro-algo-name">JumpSTART · dzieci do ok. 8 lat</h3>
        <p>
          Wersja START dla dzieci, opracowana przez dr Lou Romig: inne normy oddechu, przytomność w skali{' '}
          <Term
            explain={
              <>
                <b>A</b> (alert) — przytomne
                <br />
                <b>V</b> (voice) — reaguje na głos
                <br />
                <b>P</b> (pain) — reaguje tylko na ból
                <br />
                <b>U</b> (unresponsive) — nie reaguje
                <br />W JumpSTART CZERWONY: „P” z nieadekwatną reakcją na ból (np. bez celowego ruchu) albo „U”.
              </>
            }
          >
            AVPU
          </Term>
          , a dziecku, które nie oddycha, ale ma tętno, daje się 5 oddechów ratowniczych.
        </p>
        <details className="intro-flow">
          <summary>Schemat JumpSTART</summary>
          <AlgorithmFlow flow={JUMPSTART_FLOW} done={NONE} />
          <p className="muted">
            Niemowlę, które nie chodzi z powodu wieku: na końcu zamiast ŻÓŁTEGO — istotne obrażenia → ŻÓŁTY, brak →
            ZIELONY.
          </p>
        </details>
      </section>

      <section className="intro-algo">
        <h3 className="intro-algo-name">SALT · dorośli i dzieci</h3>
        <p>
          Opracowany w 2008 r. w USA jako wspólny standard, jeden dla wszystkich. Zaczyna od komend do całej grupy,
          każdego — także chodzącego — ocenia osobno i ma piąty kolor: SZARY.
        </p>
        <details className="intro-flow">
          <summary>Schemat SALT</summary>
          <AlgorithmFlow flow={SALT_FLOW} done={NONE} />
        </details>
      </section>

      <p className="muted">
        Zacznij od trybu <strong>Nauka</strong> — klawisz H (albo przycisk „Algorytm”) pokazuje schemat krok po kroku.
        Skąd te zasady?{' '}
        <button className="link-btn" onClick={onAbout}>
          Źródła ▸
        </button>
      </p>
    </div>
  );
}
