import {
  site,
  services,
  faqs,
  biography,
  approach,
  approachIntroduction,
  contactLink,
  contactLabel,
} from '../data/site.js';
import { Arrow, Portrait, Button, TextLink } from './UI.jsx';
import { BrandMark, BrandScene, PortraitReveal } from './Brand.jsx';
import { ContactBand, ProfessionalIdentity } from './Layout.jsx';
import { BirthMark } from './MotionGraphics.jsx';
import { INTRO_KEY, INTRO_TAB_KEY } from '../intro/session.js';

export function ServiceCards({ headingTag = 'h3' } = {}) {
  const Heading = headingTag;
  return (
    <div className="service-grid">
      {services.map((service, index) => (
        <article className="service-card" data-reveal="" data-service-key={service.slug} key={service.slug}>
          <div className="service-card__top">
            <span className="service-card__number">0{index + 1} / {service.eyebrow}</span>
            <BrandMark className="service-card__symbol" outline />
          </div>
          <Heading>{service.title}</Heading>
          <p>{service.summary}</p>
          <TextLink href={service.href} label={`Saiba mais sobre ${service.title.toLowerCase()}`}>
            Saiba mais
          </TextLink>
        </article>
      ))}
    </div>
  );
}

export function FaqSection() {
  return (
    <section id="perguntas" className="section" aria-labelledby="faq-title">
      <div className="shell faq-grid">
        <div className="faq-intro" data-reveal="">
          <p className="eyebrow eyebrow--gold">Um pouco mais de clareza</p>
          <h2 id="faq-title">Talvez você<br />esteja <em>se perguntando.</em></h2>
          <p>Algumas respostas para ajudar você a conhecer minha forma de cuidar.</p>
        </div>
        <div className="faq-list">
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <p className="eyebrow eyebrow--gold">Gislaine Duarte · Nutricionista</p>
            <h1 id="hero-title">
              <span className="hero-intro">Meu foco é ajudar você a</span>{' '}
              viver com<br /><em>qualidade</em><br />de vida.
            </h1>
            <p className="hero-description">{site.heroDescription}</p>
            <div className="actions">
              <Button href={contactLink()} external>{contactLabel}</Button>
              <TextLink href="/atendimentos/">Conhecer os atendimentos</TextLink>
            </div>
          </div>
          <div className="hero-art">
            <PortraitReveal />
            <div className="hero-arch"><BrandMark mono /></div>
            <div className="portrait-plane portrait-plane--back" aria-hidden="true" />
            <div className="portrait-plane portrait-plane--rim" aria-hidden="true" />
            <div className="hero-seal" aria-hidden="true"><BrandMark /></div>
            <Portrait priority />
            <div className="hero-sculpture-anchor" data-motion-anchor="hero" aria-hidden="true"><BirthMark /></div>
            <div className="portrait-caption" aria-hidden="true">
              <strong>Gislaine Duarte</strong>
              <span>Ciência, escuta &amp; cuidado</span>
            </div>
          </div>
        </div>
        <div className="shell hero-bottom">
          <p>Para mulheres, famílias e a vida real.</p>
          <a className="scroll-cue" href="#abordagem">O cuidado começa aqui <Arrow /></a>
          <span>De dentro para fora</span>
        </div>
      </section>

      <section id="abordagem" className="section approach" aria-labelledby="approach-title">
        <div className="shell">
          <div className="section-top">
            <p className="eyebrow">Minha abordagem</p>
            <span className="section-index">01 / A essência do cuidado</span>
          </div>
          <div className="approach-grid">
            <div className="approach-art">
              <div className="approach-art-inner">
                <h2 id="approach-title" data-reveal="">De dentro<br /><em>para fora.</em></h2>
                <BrandScene />
                <div className="approach-caption">
                  <span>Ciência encontra natureza</span>
                  <span>Você, por inteiro.</span>
                </div>
              </div>
            </div>
            <div className="approach-copy">
              <p data-reveal="">{approachIntroduction.paragraphs[0]}</p>
              <div className="pillars">
                {approach.map((pillar, index) => (
                  <article className="pillar" data-reveal="" data-pillar={index} key={pillar.title}>
                    <span className="pillar-number">0{index + 1}</span>
                    <div>
                      <h3>{pillar.title}</h3>
                      <p>{pillar.body}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="sobre" className="section">
        <div className="shell story-grid">
          <div data-reveal="">
            <div className="story-art"><div className="story-plane" aria-hidden="true" /><Portrait sizes="(min-width: 768px) 36vw, 90vw" /></div>
            <p className="story-caption">Uma história pessoal. Um propósito profissional.</p>
          </div>
          <div className="story-copy" data-reveal="">
            <p className="eyebrow eyebrow--gold">Muito prazer, sou a Nutri Gi.</p>
            <h2>Antes da profissão,<br />uma busca<br /><em>por saúde.</em></h2>
            <p>{biography.short}</p>
            <div className="education-note">{biography.education}</div>
            <TextLink href="/sobre/">Conheça minha história</TextLink>
          </div>
        </div>
      </section>

      <section id="atendimentos" className="section services-section" aria-labelledby="services-title">
        <div className="shell">
          <div className="section-heading">
            <div data-reveal="">
              <p className="eyebrow eyebrow--gold">Atendimentos</p>
              <h2 id="services-title">Um primeiro passo.<br />Um cuidado que <em>continua.</em></h2>
            </div>
            <p data-reveal="">Você pode começar com uma consulta individual ou conhecer os ciclos de acompanhamento. Vamos conhecer o seu momento?</p>
          </div>
          <div className="service-junction" data-motion-anchor="services" aria-hidden="true"><span /><span /></div>
          <ServiceCards />
          <p className="care-note"><BrandMark />Cada história pede um olhar. Cada rotina, um caminho possível.</p>
        </div>
      </section>
      <FaqSection />
      <ContactBand />
    </>
  );
}

export function AboutPage() {
  return (
    <>
      <section className="shell page-hero page-hero--split">
        <div>
          <p className="eyebrow eyebrow--gold">Minha história</p>
          <h1>{biography.title}</h1>
          <p className="page-hero__intro">Sou Gislaine Duarte.<br />Você também pode me chamar de <em>Nutri Gi.</em></p>
          <ProfessionalIdentity />
        </div>
        <div className="story-art"><Portrait priority /></div>
      </section>
      <section className="shell section about-body">
        <div className="detail-grid">
          <div>
            <p className="eyebrow eyebrow--gold">Ciência, escuta e vida real</p>
            <h2>Um olhar<br />para a sua<br /><em>história.</em></h2>
          </div>
          <div className="prose">
            {biography.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            <h2>Aprender também é uma forma de cuidar.</h2>
            <p>{biography.education}</p>
            <p>Continuo estudando para aprofundar meu olhar e oferecer um cuidado humano, individualizado e orientado pelo conhecimento científico.</p>
            <div className="related-service">
              <p className="eyebrow">Conheça minha abordagem</p>
              <p>{approachIntroduction.paragraphs[1]}</p>
              <TextLink href="/#abordagem">Ciência e cuidado de dentro para fora</TextLink>
            </div>
          </div>
        </div>
      </section>
      <ContactBand />
    </>
  );
}

export function ServicesPage() {
  return (
    <>
      <section className="shell page-hero">
        <p className="eyebrow eyebrow--gold">Atendimentos com a Nutri Gi</p>
        <h1>Um cuidado que faz sentido<br />para <em>o seu momento.</em></h1>
        <p className="page-hero__intro">Você pode começar com uma consulta individual ou conhecer os ciclos de acompanhamento. São formas de atendimento para compreender melhor sua alimentação e construir mudanças com orientação profissional.</p>
      </section>
      <section className="shell" style={{ paddingBottom: 'var(--section-space)' }}>
        <ServiceCards headingTag="h2" />
      </section>
      <FaqSection />
      <ContactBand />
    </>
  );
}

export function ServicePage({ service, index }) {
  const related = services.find((item) => item.slug !== service.slug);
  return (
    <>
      <section className="shell page-hero page-hero--split">
        <div>
          <p className="eyebrow eyebrow--gold">{service.eyebrow}</p>
          <h1>{service.title}</h1>
          <p className="page-hero__intro">{service.intro}</p>
          <div className="actions"><Button href={contactLink(service)} external>Solicitar orçamento</Button></div>
        </div>
        <div className="service-hero-symbol" data-service-key={service.slug} data-motion-anchor="detail">
          <BrandScene />
          <span className="service-number" aria-hidden="true">0{index + 1}</span>
        </div>
      </section>
      <section className="section service-details">
        <div className="shell detail-grid">
          <div data-reveal="">
            <p className="eyebrow eyebrow--gold">A proposta</p>
            <h2>
              {index === 0
                ? <>Primeiro,<br />entender <em>você.</em></>
                : <>Cuidar.<br />Praticar.<br /><em>Continuar.</em></>}
            </h2>
          </div>
          <div className="prose">
            {service.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            <h2>Como acontece esse cuidado</h2>
            <ol className="service-steps">
              {service.steps.map((step, stepIndex) => (
                <li data-reveal="" key={step.title}>
                  <span>0{stepIndex + 1}</span>
                  <div><h3>{step.title}</h3><p>{step.body}</p></div>
                </li>
              ))}
            </ol>
            {service.confirmedDeliverables.length > 0 && (
              <>
                <h2>O que está incluído</h2>
                <ul>{service.confirmedDeliverables.map((item) => <li key={item}>{item}</li>)}</ul>
              </>
            )}
            <div className="service-note">
              <p>Para conhecer as condições do atendimento e solicitar seu orçamento, converse comigo pelo WhatsApp.</p>
            </div>
            {related && (
              <div className="related-service">
                <p className="eyebrow">Conheça também</p>
                <TextLink href={related.href}>{related.title}</TextLink>
              </div>
            )}
          </div>
        </div>
      </section>
      <ContactBand service={service} />
    </>
  );
}

export function ContactPage() {
  return (
    <>
      <section className="shell page-hero">
        <p className="eyebrow eyebrow--gold">Vamos conversar</p>
        <h1>Seu próximo passo<br />pode começar com<br /><em>uma conversa.</em></h1>
        <p className="page-hero__intro">Quero conhecer o seu momento. Fale comigo para saber mais sobre os atendimentos e solicitar um orçamento.</p>
        <ProfessionalIdentity />
      </section>
      <section className="shell contact-page-grid">
        <div className="contact-card">
          <p className="eyebrow">Pelo WhatsApp</p>
          <h2>Falar com a Nutri Gi</h2>
          <p>{site.contact.whatsappDisplay}</p>
          <p>O link abre uma conversa com uma mensagem pronta para você revisar e enviar.</p>
          <Button href={contactLink()} external>Iniciar conversa</Button>
          <div className="contact-options">
            <p>Já sabe qual atendimento deseja conhecer?</p>
            {services.map((service) => (
              <a className="text-link" href={contactLink(service)} target="_blank" rel="noopener noreferrer" key={service.slug}>
                {service.shortTitle}<Arrow external />
              </a>
            ))}
          </div>
        </div>
        <div className="contact-card">
          <p className="eyebrow">Prefere escrever por e-mail?</p>
          <h2>Vamos por aqui.</h2>
          <p>Você também pode enviar sua dúvida sobre os atendimentos por e-mail.</p>
          <a className="contact-email" href={`mailto:${site.contact.email}`}>{site.contact.email}</a>
          <p style={{ marginTop: 24 }}>Para esse primeiro contato, basta contar qual atendimento deseja conhecer. Informações de saúde podem ser conversadas no contexto da avaliação individual.</p>
          <TextLink href="/privacidade/">Como cuidamos da sua privacidade</TextLink>
        </div>
      </section>
    </>
  );
}

export function PrivacyPage() {
  return (
    <>
      <section className="shell page-hero">
        <p className="eyebrow eyebrow--gold">Transparência</p>
        <h1>Sua privacidade<br />também merece <em>cuidado.</em></h1>
        <p className="page-hero__intro">Como as informações são tratadas ao navegar neste site e iniciar um contato.</p>
      </section>
      <section className="shell privacy-layout">
        <div className="prose">
          <p className="privacy-date">Atualizada em 21 de setembro de 2026.</p>
          <h2>Identificação profissional</h2>
          <p>Este é o site profissional de {site.fullName}, {site.profession.toLowerCase()}, {site.registration}. O contato para questões sobre privacidade é <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>.</p>
          <h2>Durante a navegação</h2>
          <p>Este site apresenta informações sobre Gislaine Duarte, seus atendimentos e a coleção digital “7 receitas para ajudar você a desinflamar!”. Não há formulário de saúde ou área de prontuário. Não instalamos ferramentas de publicidade, pixels de rastreamento ou cookies de análise.</p>
          <p>Para não repetir a introdução na mesma aba, o navegador guarda temporariamente o estado da abertura em <code>{INTRO_KEY}</code> e um identificador aleatório da aba em <code>{INTRO_TAB_KEY}</code>. A preferência <code>gi-visited</code> também ajusta a apresentação em visitas repetidas. Esses registros ficam no armazenamento da sessão do navegador, não são enviados a Gislaine e não são usados para rastreamento.</p>
          <h2>Na coleção digital</h2>
          <p>Enquanto o checkout temporário estiver habilitado, a confirmação de demonstração cria uma sessão assinada em cookie <code>httpOnly</code>, com prazo configurável e uso restrito à validação de acesso. O valor não fica disponível ao JavaScript da página. Quando o modo está bloqueado ou a configuração segura está ausente, o acesso não é liberado.</p>
          <p>Favoritos, receitas preparadas, checklists, multiplicadores e a lista de compras são preferências não sensíveis guardadas somente no armazenamento local do seu navegador. Elas não são enviadas a Gislaine. Você pode removê-las limpando os dados deste site no navegador. A experiência continua em memória quando esse armazenamento está indisponível.</p>
          <h2>Ao entrar em contato</h2>
          <p>Os botões de WhatsApp abrem um serviço externo, com uma mensagem que você pode revisar antes de enviar. Os links de e-mail abrem o aplicativo configurado no seu dispositivo. A abertura do link, por si só, não envia uma mensagem ou confirma um atendimento.</p>
          <p>Se você enviar uma mensagem, o canal escolhido receberá os dados que você decidir compartilhar. O funcionamento e o tratamento de dados nessas plataformas seguem também suas próprias políticas. Para o primeiro contato, prefira informações sobre o atendimento desejado; não é necessário enviar exames ou histórico de saúde.</p>
          <h2>Recursos técnicos</h2>
          <p>As imagens, fontes e arquivos de apresentação são servidos pelo próprio site. A infraestrutura de hospedagem pode processar dados técnicos necessários à entrega das páginas, como endereço IP, horário da solicitação e informações do navegador.</p>
          <h2>Dúvidas sobre suas informações</h2>
          <p>Para conversar sobre privacidade ou solicitar informações a respeito de dados compartilhados diretamente com Gislaine, escreva para <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>.</p>
          <h2>Atualizações</h2>
          <p>Esta página será atualizada se novas funcionalidades alterarem o tratamento de informações no site.</p>
        </div>
      </section>
    </>
  );
}

export function NotFoundPage() {
  return (
    <section className="shell not-found">
      <div>
        <p className="eyebrow eyebrow--gold">404 / Um novo caminho</p>
        <h1>Vamos encontrar<br /><em>o seu caminho?</em></h1>
        <p>A página que você procurou não está por aqui. Você pode voltar ao início ou conhecer meus atendimentos.</p>
        <div className="actions">
          <Button href="/">Voltar ao início</Button>
          <TextLink href="/atendimentos/">Conhecer atendimentos</TextLink>
        </div>
      </div>
      <BrandMark />
    </section>
  );
}
