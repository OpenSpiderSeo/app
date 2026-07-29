/**
 * Carbon desk atmosphere — soft red glow on dark canvas (Gurov UX rhythm).
 */
import { memo } from 'react';

export const EchoAtmosphere = memo(function EchoAtmosphere({ dense = false }: { dense?: boolean }) {
  return (
    <div className={`echo-atmo ${dense ? 'echo-atmo--dense' : ''}`} aria-hidden>
      <div className="echo-atmo__wash" />
      <div className="echo-atmo__lattice" />
      <div className="echo-atmo__ping echo-atmo__ping--a" />
      <div className="echo-atmo__ping echo-atmo__ping--b" />
      {dense ? <div className="echo-atmo__ping echo-atmo__ping--c" /> : null}
    </div>
  );
});
