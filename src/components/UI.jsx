export function Arrow({ external = false, diagonal = false, className = '' }) {
  return <svg className={`arrow ${className}`} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={external || diagonal ? 'M5 19 19 5M5 5h14v14' : 'M4 12h15m-6-6 6 6-6 6'} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function Portrait({ className = '', priority = false, sizes = '(min-width: 1100px) 44vw, (min-width: 768px) 49vw, calc(100vw - 40px)' }) {
  const source = format => [360, 540, 720, 960].map(width => `/images/gislaine-duarte-${width}.${format} ${width}w`).join(', ');
  return <picture className={`portrait ${className}`}><source type="image/avif" srcSet={source('avif')} sizes={sizes} /><source type="image/webp" srcSet={source('webp')} sizes={sizes} /><img src="/images/gislaine-duarte-960.webp" width="960" height="1280" alt="Gislaine Duarte, nutricionista, à mesa com seu notebook." loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" /></picture>;
}

export function Button({ href, children, secondary = false, external = false, className = '' }) {
  if (!href) return null;
  return <a className={`button ${secondary ? 'button--secondary' : ''} ${className}`} href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}><span>{children}</span><span className="button__icon"><Arrow external={external} /></span></a>;
}

export function TextLink({ href, children, label = '', external = false }) {
  return <a className="text-link" href={href} aria-label={label || undefined} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>{children}<Arrow external={external} /></a>;
}
