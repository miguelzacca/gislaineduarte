import { useId } from 'react';
import { BRAND_PARTS, BRAND_PATHS, BRAND_VIEWBOX } from '../lib/brand.js';
import { site } from '../data/site.js';
import '../styles/intro.css';

const PULP_CONTOUR = `${BRAND_PATHS.pulp.split('Z')[0]}Z`;

export function IntroOverlay() {
  const reactId = useId().replaceAll(':', '');
  const portalId = `gi-intro-${reactId}-portal`;

  return (
    <div className="intro-overlay" data-intro-overlay="" data-skip-ready="false">
      <div className="intro-overlay__graphics" aria-hidden="true">
        <svg className="intro-overlay__curtain" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" focusable="false">
          <defs>
            <mask id={portalId} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1000">
              <rect width="1000" height="1000" fill="white" />
              <path className="intro-overlay__portal" data-intro-portal-shape="" d={PULP_CONTOUR} fill="black" />
            </mask>
          </defs>
          <rect className="intro-overlay__paper" width="1000" height="1000" mask={`url(#${portalId})`} />
        </svg>

        <div className="intro-overlay__stage" data-intro-stage="">
          {BRAND_PARTS.map(({ name, path, color }, index) => {
            const fillId = `gi-intro-${reactId}-${name}-fill`;
            return (
              <div className={`intro-overlay__plane intro-overlay__plane--${name}`} data-intro-part={name} style={{ '--part-index': index }} key={name}>
                <svg viewBox={BRAND_VIEWBOX} width="740" height="1060" focusable="false">
                  <defs>
                    <mask id={fillId} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="280" y="80" width="740" height="1060">
                      <path className="intro-overlay__fill-mask" data-intro-fill-mask={name} d={path} fill="none" stroke="white" strokeWidth="240" pathLength="1" />
                    </mask>
                  </defs>
                  <path className="intro-overlay__ghost" d={path} fill="none" fillRule="evenodd" vectorEffect="non-scaling-stroke" />
                  <path className="intro-overlay__fill" d={path} fill={color} fillRule="evenodd" mask={`url(#${fillId})`} />
                  <path className="intro-overlay__stroke" data-intro-stroke={name} d={path} fill="none" fillRule="evenodd" pathLength="1" vectorEffect="non-scaling-stroke" />
                </svg>
              </div>
            );
          })}
        </div>

        <div className="intro-overlay__wordmark">
          <p className="intro-overlay__name">{site.name}</p>
          <p className="intro-overlay__profession">{site.profession}</p>
        </div>
        <p className="intro-overlay__signature">De dentro para fora.</p>
      </div>

      <button className="intro-overlay__skip" type="button" tabIndex={-1} data-intro-skip="" aria-label="Pular introdução e conhecer o site">
        <span>Pular introdução</span>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true" focusable="false">
          <path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
