import { useId } from 'react';
import { BRAND_PARTS, BRAND_PATHS, BRAND_VIEWBOX } from '../lib/brand.js';
import '../styles/vector-narrative.css';

export function WorldMark({ className = '' } = {}) {
  return (
    <svg
      className={`world-mark ${className}`.trim()}
      viewBox={BRAND_VIEWBOX}
      width="740"
      height="1060"
      data-world-mark=""
      aria-hidden="true"
      focusable="false"
    >
      {BRAND_PARTS.map(({ name, path, color }) => (
        <g className={`world-mark__part world-mark__part--${name}`} data-world-part={name} key={name}>
          <path className="world-mark__depth" data-world-depth="" d={path} fillRule="evenodd" opacity="0" />
          <path className="world-mark__fill" data-world-fill="" d={path} fill={color} fillRule="evenodd" />
          <path
            className="world-mark__outline"
            data-world-outline=""
            d={path}
            fill="none"
            fillRule="evenodd"
            pathLength="1"
            vectorEffect="non-scaling-stroke"
            opacity=".12"
          />
        </g>
      ))}
    </svg>
  );
}

export function JourneySvg({ className = '', idPrefix = 'gi-journey' } = {}) {
  const reactId = useId().replaceAll(':', '');
  const safeId = `${idPrefix}-${reactId}-safe`;
  const drawId = `${idPrefix}-${reactId}-draw`;
  return (
    <svg
      className={`vector-journey ${className}`.trim()}
      viewBox="0 0 1440 900"
      preserveAspectRatio="none"
      data-journey-svg=""
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <mask id={safeId} data-journey-safe-mask="" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="1440" height="900">
          <rect data-journey-mask-base="" width="100%" height="100%" fill="white" />
          <g data-journey-avoid="" fill="black" />
        </mask>
        <mask id={drawId} data-journey-draw-region="" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="1440" height="900">
          <path
            data-journey-mask-draw=""
            d="M0 0"
            fill="none"
            stroke="white"
            strokeWidth="12"
            strokeLinecap="round"
            pathLength="1"
          />
        </mask>
      </defs>
      <g mask={`url(#${safeId})`}>
        <path className="vector-journey__guide" data-journey-guide="" d="M0 0" pathLength="1" />
        <path
          className="vector-journey__ink"
          data-journey-main=""
          d="M0 0"
          pathLength="1"
          mask={`url(#${drawId})`}
        />
        {[0, 1].map((branch) => (
          <g className="vector-journey__branch-group" key={branch}>
            <path className="vector-journey__branch-guide" data-journey-branch-guide={branch} d="M0 0" pathLength="1" opacity="0" />
            <path className="vector-journey__branch" data-journey-branch={branch} d="M0 0" pathLength="1" strokeDasharray="1" strokeDashoffset="1" />
            <circle className="vector-journey__terminal" data-journey-terminal={branch} cx="0" cy="0" r="4" opacity="0" />
          </g>
        ))}
        <path className="vector-journey__return" data-journey-return="" d="M0 0" pathLength="1" opacity="0" />
        <g className="vector-journey__front" data-journey-front="" opacity="0">
          <circle className="vector-journey__front-ring" r="7" />
          <circle className="vector-journey__front-core" r="2.4" />
        </g>
      </g>
    </svg>
  );
}

export function BirthMark({ className = '', progress } = {}) {
  const reactId = useId().replaceAll(':', '');
  return (
    <svg
      className={`birth-mark ${className}`.trim()}
      viewBox={BRAND_VIEWBOX}
      width="74"
      height="106"
      data-birth-mark=""
      style={typeof progress === 'number' ? { '--birth-progress': Math.min(1, Math.max(0, progress)) } : undefined}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {BRAND_PARTS.map(({ name, path }) => (
          <mask key={name} id={`gi-birth-${reactId}-${name}`} maskUnits="userSpaceOnUse" x="220" y="20" width="860" height="1180">
            <path
              d={path}
              className="birth-mark__mask"
              data-birth-mask={name}
              fill="none"
              stroke="white"
              strokeWidth="270"
              pathLength="1"
              style={{ '--part-index': BRAND_PARTS.findIndex((part) => part.name === name) }}
            />
          </mask>
        ))}
      </defs>
      {BRAND_PARTS.map(({ name, path, color }, index) => (
        <g
          className={`birth-mark__part birth-mark__part--${name}`}
          data-birth-part={name}
          style={{ '--part-index': index }}
          key={name}
        >
          <path
            className="birth-mark__fill"
            data-birth-fill={name}
            d={path}
            fill={color}
            fillRule="evenodd"
            mask={`url(#gi-birth-${reactId}-${name})`}
          />
          <path
            className="birth-mark__outline"
            data-birth-outline={name}
            d={path}
            fill="none"
            pathLength="1"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
    </svg>
  );
}

export function MenuWeave({ className = '' } = {}) {
  return (
    <svg
      className={`menu-weave ${className}`.trim()}
      viewBox="130 0 1040 1220"
      width="520"
      height="610"
      data-menu-weave=""
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="menu-weave__thread"
        d="M-20 995C300 1128 222 825 418 734S831 784 884 603 898 386 995 328"
        pathLength="1"
      />
      {BRAND_PARTS.map(({ name, path }, index) => (
        <g className={`menu-weave__part menu-weave__part--${name}`} data-menu-part={name} style={{ '--part-index': index }} key={name}>
          <path d={path} pathLength="1" fillRule="evenodd" vectorEffect="non-scaling-stroke" />
        </g>
      ))}
      <path className="menu-weave__echo" d={BRAND_PATHS.seed} pathLength="1" transform="translate(-25 24)" />
    </svg>
  );
}
