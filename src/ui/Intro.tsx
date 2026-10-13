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
        natychmiast — np. zakłada opaskę uciskową, żeby zatamować krwotok, albo udrażnia drogi oddechowe — oznacza
        poszkodowanego kolorem i idzie dalej. Potem zwykle przeprowadza się ponowną segregację, bo stan poszkodowanych się zmienia.
      </p>

      <h2 className="h-small">Algorytmy w grze</h2>
      <ul className="about-list intro-list">
        <li>
          <strong>START</strong> — najpopularniejszy algorytm dla dorosłych.
        </li>
        <li>
          <strong>JumpSTART</strong> — wersja dla dzieci (mniej więcej do 8 lat). Dzieci normalnie oddychają szybciej,
          a u nich częściej najpierw ustaje oddech, a dopiero potem praca serca.
        </li>
        <li>
          <strong>SALT</strong> — nowszy algorytm, jeden dla dorosłych i dzieci, z dodatkową kategorią SZARĄ.
        </li>
      </ul>

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
