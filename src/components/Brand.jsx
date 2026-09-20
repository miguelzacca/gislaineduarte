import { BRAND_PARTS, BRAND_VIEWBOX } from '../lib/brand.js';

export function BrandMark({ className = '', mono = false, outline = false } = {}) {
  const classes = [
    'brand-mark',
    className,
    mono && 'brand-mark--mono',
    outline && 'brand-mark--outline',
  ].filter(Boolean).join(' ');

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={BRAND_VIEWBOX}
      width="74"
      height="106"
      className={classes}
      aria-hidden="true"
      focusable="false"
    >
      {BRAND_PARTS.map(({ name, path, color }) => (
        <path
          key={name}
          d={path}
          fill={outline ? 'none' : mono ? 'currentColor' : color}
          fillRule="evenodd"
          stroke={outline ? 'currentColor' : undefined}
          strokeWidth={outline ? '1.25' : undefined}
          vectorEffect={outline ? 'non-scaling-stroke' : undefined}
          pathLength="1"
          className={`brand-mark__part brand-mark__part--${name}`}
          data-brand-part={name}
        />
      ))}
    </svg>
  );
}

export function BrandScene({ className = '' } = {}) {
  return (
    <div
      className={['brand-scene', className].filter(Boolean).join(' ')}
      data-brand-scene=""
      aria-hidden="true"
    >
      <svg
        className="brand-scene__orbits"
        viewBox="0 0 640 640"
        fill="none"
        focusable="false"
      >
        <ellipse cx="320" cy="320" rx="278" ry="278" />
        <ellipse cx="320" cy="320" rx="238" ry="278" transform="rotate(-32 320 320)" />
        <path d="M42 320H83M557 320H598M320 42V65M320 575V598" />
        <circle cx="320" cy="42" r="3" fill="currentColor" stroke="none" />
        <circle cx="598" cy="320" r="3" fill="currentColor" stroke="none" />
      </svg>
      <div className="brand-scene__fallback" data-scene-fallback="">
        <BrandMark mono />
      </div>
      <div className="brand-scene__canvas" data-scene-canvas="" />
    </div>
  );
}

