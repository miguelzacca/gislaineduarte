import { useEffect, useRef, useState } from 'react';
import { site, navigation, contactLink, contactLabel } from '../data/site.js';
import { BrandMark } from './Brand.jsx';
import { Button } from './UI.jsx';
import { MenuWeave } from './MotionGraphics.jsx';
import { playMenu } from '../motion/transitions.js';

export function Wordmark() {
  return <a className="wordmark" href="/" aria-label="Gislaine Duarte Nutricionista — início"><BrandMark /><span><span className="wordmark__name">Gislaine Duarte</span>{' '}<span className="wordmark__profession">Nutricionista</span></span></a>;
}

function NavLinks({ path, mobile = false, onNavigate }) {
  return navigation.map((item, index) => {
    const current = item.href === path || (path.startsWith('/atendimentos/') && item.href === '/atendimentos/');
    return <a href={item.href} key={item.href} aria-current={current ? 'page' : undefined} onClick={onNavigate}>{mobile ? <small aria-hidden="true">0{index + 1}</small> : null}{item.label}</a>;
  });
}

export function Header({ path }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const closeRef = useRef(null);
  const animationRef = useRef(null);

  function closeMenu(immediate = false) {
    if (!dialogRef.current?.open) return;
    animationRef.current?.cancel();
    if (immediate) { setOpen(false); return; }
    const animation = playMenu(dialogRef.current, false);
    animationRef.current = animation;
    animation.finished.then(() => { if (animationRef.current === animation) setOpen(false); }).catch(() => {});
  }

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const scrollY = window.scrollY;
    dialog.showModal();
    document.body.classList.add('menu-open');
    closeRef.current.focus();
    animationRef.current = playMenu(dialog, true);
    const media = matchMedia('(min-width: 768px)');
    const closeOnDesktop = event => { if (event.matches) setOpen(false); };
    media.addEventListener('change', closeOnDesktop);
    return () => {
      animationRef.current?.cancel();
      animationRef.current = null;
      media.removeEventListener('change', closeOnDesktop);
      if (dialog.open) dialog.close();
      document.body.classList.remove('menu-open');
      window.scrollTo({ top: scrollY, behavior: 'instant' });
      triggerRef.current?.focus({ preventScroll: true });
    };
  }, [open]);

  function trapFocus(event) {
    if (event.key !== 'Tab') return;
    const items = [...dialogRef.current.querySelectorAll('a[href],button:not([disabled])')];
    if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
  }

  return <><header className="site-header"><div className="shell header-inner"><Wordmark /><nav className="desktop-nav" aria-label="Navegação principal"><NavLinks path={path} /></nav><Button href={contactLink()} external className="header-contact">{contactLabel}</Button><button ref={triggerRef} className="menu-toggle" type="button" aria-label="Abrir menu" aria-expanded={open} aria-controls="navigation-dialog" onClick={() => setOpen(true)}><span>Menu</span><span className="menu-toggle__lines" aria-hidden="true" /></button></div></header><dialog ref={dialogRef} id="navigation-dialog" className="navigation-dialog" aria-label="Navegação principal" onCancel={event => { event.preventDefault(); closeMenu(); }} onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) closeMenu(); }} onKeyDown={trapFocus}><MenuWeave /><div className="menu-top"><Wordmark /><button ref={closeRef} className="menu-close" type="button" aria-label="Fechar menu" onClick={() => closeMenu()}>×</button></div><nav className="menu-nav" aria-label="Menu"><NavLinks path={path} mobile onNavigate={() => closeMenu(true)} /></nav><div className="menu-foot"><p>Um cuidado que considera você por inteiro.</p><a href={contactLink()} target="_blank" rel="noopener noreferrer" onClick={() => closeMenu(true)}>{site.contact.whatsappDisplay} ↗</a><a href={`mailto:${site.contact.email}`} onClick={() => closeMenu(true)}>{site.contact.email}</a><BrandMark mono /></div></dialog></>;
}

export function ProfessionalIdentity() {
  return <div className="professional-identity">
    <p className="professional-identity__name">{site.fullName}</p>
    <p>{site.profession} <span aria-hidden="true">·</span> <strong>{site.registration}</strong></p>
    <a href={site.registrationDetails.directoryUrl} target="_blank" rel="noopener noreferrer" aria-label={`Consultar no ${site.registrationDetails.council} (inscrição profissional; abre em nova aba)`}>Consultar no {site.registrationDetails.council} <span aria-hidden="true">↗</span></a>
  </div>;
}

export function Footer() {
  return <footer className="site-footer"><div className="shell"><div className="footer-top"><div className="footer-brand"><Wordmark /><p>{site.tagline}</p><ProfessionalIdentity /></div><div><p className="footer-label">Explore com calma</p><nav className="footer-links" aria-label="Navegação do rodapé">{navigation.map(item => <a key={item.href} href={item.href}>{item.label}</a>)}</nav></div><div><p className="footer-label">Vamos conversar</p><div className="footer-links"><a href={contactLink()} target="_blank" rel="noopener noreferrer">WhatsApp · {site.contact.whatsappDisplay}</a><a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>{site.contact.instagram ? <a href={site.contact.instagram} target="_blank" rel="noopener noreferrer">Instagram ↗</a> : null}<a href="/privacidade/">Política de privacidade</a></div></div></div><div className="footer-bottom"><p>© 2026 {site.fullName} · {site.profession}</p><p>{site.editorialNotice}</p></div></div></footer>;
}

export function Breadcrumbs({ items }) {
  return <nav className="shell breadcrumb" aria-label="Caminho da página">{items.map((item, index) => <span className="breadcrumb__item" key={item.href}>{index ? <span aria-hidden="true">/</span> : null}{index === items.length - 1 ? <span aria-current="page">{item.name}</span> : <a href={item.href}>{item.name}</a>}</span>)}</nav>;
}

export function ContactBand({ service }) {
  return <section className="contact-band" aria-labelledby="contact-title"><BrandMark className="contact-band__symbol" mono /><div className="contact-sculpture-anchor" data-motion-anchor="contact" aria-hidden="true" /><div className="shell contact-band__inner"><div data-reveal><p className="eyebrow">Seu próximo passo</p><h2 id="contact-title">Vamos conversar<br />sobre <em>você?</em></h2></div><div className="contact-band__actions" data-reveal><p>Cuidar da alimentação pode começar com uma conversa. Conheça as possibilidades de atendimento para o seu momento.</p><Button href={contactLink(service)} external>{service ? 'Solicitar orçamento' : contactLabel}</Button></div></div></section>;
}
