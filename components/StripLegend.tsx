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
      <ul>
        <li>
          <strong>Xətkeşin uzunluğu</strong>
          Bazardakı ən ucuz və ən bahalı qiymət arasındakı məsafədir.
        </li>
        <li>
          <strong>Rəngli hissə</strong>
          Satıcıların əsas kütləsinin satdığı aralıqdır. Ən ucuz və ən bahalı istisnalar bura düşmür.
        </li>
        <li>
          <strong>Şaquli xətt</strong>
          Medianı göstərir: satıcıların yarısı ondan ucuz, yarısı bahalı satır.
        </li>
        <li>
          <strong>Orijinal və replika</strong>
          Ayrı hesablanır, çünki bunlar fərqli bazardır.
        </li>
      </ul>
    </section>
  );
}
