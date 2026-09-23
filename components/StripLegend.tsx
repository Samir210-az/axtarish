import type { CSSProperties } from "react";

const style = { "--p25": "28%", "--p75": "68%", "--median": "48%" } as CSSProperties;

export function StripLegend() {
  return (
    <section className="legend" aria-labelledby="legend-title">
      <h2 id="legend-title">Nəticəni necə oxumaq olar</h2>
      <div className="strip strip-original" style={style} aria-hidden="true">
        <div className="strip-track">
          <span className="strip-band" />
          <span className="strip-median" />
        </div>
        <div className="strip-ends">
          <span>ən aşağı</span>
          <span>ən yuxarı</span>
        </div>
      </div>
      <ul className="badges">
        <li>
          <span className="badge" aria-hidden="true">
            <svg
              viewBox="0 0 32 32"
              width="30"
              height="30"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="26" height="10" rx="1.5" />
              <path d="M8 11v4M12 11v6M16 11v4M20 11v6M24 11v4" />
            </svg>
          </span>
          <strong>Xətkeşin uzunluğu</strong>
          Bazardakı ən ucuz və ən bahalı qiymət arasındakı məsafədir.
        </li>
        <li>
          <span className="badge" aria-hidden="true">
            <svg
              viewBox="0 0 32 32"
              width="30"
              height="30"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 6v20M23 6v20" />
              <rect
                x="9"
                y="11"
                width="14"
                height="10"
                fill="currentColor"
                fillOpacity="0.22"
                stroke="none"
              />
              <path d="M3 16h6M23 16h6" />
            </svg>
          </span>
          <strong>Rəngli hissə</strong>
          Satıcıların əsas kütləsinin satdığı aralıqdır. Ən ucuz və ən bahalı istisnalar bura
          düşmür.
        </li>
        <li>
          <span className="badge" aria-hidden="true">
            <svg
              viewBox="0 0 32 32"
              width="30"
              height="30"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 4v24" />
              <path d="M16 11l4 5-4 5-4-5z" fill="currentColor" fillOpacity="0.3" />
            </svg>
          </span>
          <strong>Şaquli xətt</strong>
          Medianı göstərir: satıcıların yarısı ondan ucuz, yarısı bahalı satır.
        </li>
      </ul>
      <p className="pill">Orijinal və replika ayrı hesablanır, çünki bunlar fərqli bazardır.</p>
    </section>
  );
}
