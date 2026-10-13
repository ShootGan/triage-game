import { SOURCES, SOURCE_KIND_LABEL } from './sources';

const AUTHORS = ['Paweł Nalepka', 'Claude (Anthropic)'];

/** „O grze": authors, sources behind the algorithms and a disclaimer. Opened from the menu. */
export function AboutScreen({ onClose }: { onClose: () => void }) {
  return (
    <div className="panel menu-panel about">
      <div className="about-head">
        <h1 className="title">O grze</h1>
        <button className="btn" onClick={onClose} autoFocus>
          ◂ Menu
        </button>
      </div>

      <h2 className="h-small">Autorzy</h2>
      <ul className="about-list">
        {AUTHORS.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>

      <h2 className="h-small">Źródła</h2>
      <p className="muted">
        Kryteria algorytmów START, JumpSTART i SALT w grze opierają się na poniższych publikacjach. Badania pokazują, że
        żaden algorytm nie jest nieomylny — to standard nauczania, nie wyrocznia.
      </p>
      <ol className="about-sources">
        {SOURCES.map((s) => (
          <li key={s.doi ?? s.citation}>
            <span className="badge">{SOURCE_KIND_LABEL[s.kind]}</span> {s.citation}
            {s.doi && (
              <>
                {' '}
                <a href={`https://doi.org/${s.doi}`} target="_blank" rel="noreferrer">
                  doi:{s.doi}
                </a>
              </>
            )}
            {s.url && (
              <>
                {' '}
                <a href={s.url} target="_blank" rel="noreferrer">
                  link
                </a>
              </>
            )}
            {s.pmid && (
              <>
                {' · '}
                <a href={`https://pubmed.ncbi.nlm.nih.gov/${s.pmid}/`} target="_blank" rel="noreferrer">
                  PMID {s.pmid}
                </a>
              </>
            )}
            <div className="muted">{s.supports}</div>
          </li>
        ))}
      </ol>

      <h2 className="h-small">Zastrzeżenie</h2>
      <p className="muted">
        Gra ma charakter edukacyjny i nie zastępuje szkolenia z segregacji medycznej ani lokalnych procedur. Pacjenci
        i zdarzenia są fikcyjne.
      </p>
    </div>
  );
}
