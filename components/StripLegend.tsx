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
        <li>Xətkeşin uzunluğu bazardakı ən ucuz və ən bahalı qiymət arasındakı məsafədir.</li>
        <li>Rəngli hissə satıcıların əsas kütləsinin satdığı aralıqdır. Ən ucuz və ən bahalı istisnalar bura düşmür.</li>
        <li>Şaquli xətt medianı göstərir: satıcıların yarısı ondan ucuz, yarısı bahalı satır.</li>
        <li>Orijinal və replika ayrı hesablanır, çünki bunlar fərqli bazardır.</li>
      </ul>
    </section>
  );
}
