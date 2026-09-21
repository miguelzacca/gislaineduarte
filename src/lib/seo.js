import { site } from '../data/site.js';

export const siteNoindex =
  process.env.PUBLIC_SITE_NOINDEX === 'true' ||
  process.env.NODE_ENV === 'development' ||
  ['preview', 'development'].includes(process.env.VERCEL_ENV || '') ||
  ['deploy-preview', 'branch-deploy'].includes(process.env.CONTEXT || '');

export function canonicalUrl(path) {
  const pathname = new URL(path, site.url).pathname;
  const normalized = pathname === '/' || /\.[a-z0-9]+$/i.test(pathname)
    ? pathname
    : `${pathname.replace(/\/+$/, '')}/`;
  return `${site.url}${normalized}`;
}

export function buildMetadata(path, title, description, noindex = false, socialImage = site.socialImage) {
  const preventIndexing = noindex || siteNoindex;
  return {
    title: title.includes(site.name) ? title : `${title} | ${site.name}`,
    description,
    canonical: canonicalUrl(path),
    robots: preventIndexing ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    noindex: preventIndexing,
    ogImage: new URL(socialImage.src, site.url).href,
    ogImageAlt: socialImage.alt,
    ogImageWidth: socialImage.width,
    ogImageHeight: socialImage.height,
    locale: site.locale,
  };
}

export function buildJsonLd(
  path,
  title,
  description,
  options = {},
) {
  const url = canonicalUrl(path);
  const personId = `${site.url}/#gislaine-duarte`;
  const websiteId = `${site.url}/#website`;
  const pageId = `${url}#webpage`;
  const serviceId = options.service ? `${canonicalUrl(options.service.href)}#service` : null;
  const productId = options.product ? `${canonicalUrl(options.product.publicPath)}#product` : null;
  const visibleFaqs = options.faqs?.length ? options.faqs : null;
  const person = {
    '@type': 'Person',
    '@id': personId,
    name: site.fullName,
    alternateName: [site.name, site.familiarName],
    jobTitle: site.profession,
    url: `${site.url}/sobre/`,
    image: new URL(site.portrait, site.url).href,
  };
  if (site.contact.email) person.email = site.contact.email;
  if (site.contact.whatsapp) person.telephone = `+${site.contact.whatsapp}`;
  if (site.contact.instagram) person.sameAs = [site.contact.instagram];
  if (site.registration) {
    person.identifier = {
      '@type': 'PropertyValue',
      propertyID: site.registrationDetails.council,
      value: site.registrationDetails.number,
      name: 'Registro profissional de nutricionista',
    };
    person.hasCredential = {
      '@type': 'EducationalOccupationalCredential',
      name: site.registration,
      credentialCategory: 'Registro profissional',
      identifier: person.identifier,
      recognizedBy: {
        '@type': 'Organization',
        name: site.registrationDetails.councilName,
        url: site.registrationDetails.councilUrl,
      },
    };
  }

  const page = {
    '@type': visibleFaqs ? ['WebPage', 'FAQPage'] : 'WebPage',
    '@id': pageId,
    url,
    name: title,
    description,
    inLanguage: site.language,
    isPartOf: { '@id': websiteId },
    about: { '@id': serviceId || productId || personId },
  };
  if (visibleFaqs) {
    page.mainEntity = visibleFaqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    }));
  } else if (serviceId) {
    page.mainEntity = { '@id': serviceId };
  } else if (url === `${site.url}/sobre/`) {
    page['@type'] = 'AboutPage';
    page.mainEntity = { '@id': personId };
  } else if (url === `${site.url}/contato/`) {
    page['@type'] = 'ContactPage';
  }

  const graph = [
    person,
    {
      '@type': 'WebSite',
      '@id': websiteId,
      url: `${site.url}/`,
      name: `${site.name} · ${site.profession}`,
      inLanguage: site.language,
      publisher: { '@id': personId },
    },
    page,
  ];

  if (options.service && serviceId) {
    graph.push({
      '@type': 'Service',
      '@id': serviceId,
      name: options.service.title,
      serviceType: options.service.title,
      description: options.service.summary,
      url: canonicalUrl(options.service.href),
      provider: { '@id': personId },
      mainEntityOfPage: { '@id': pageId },
    });
  }

  if (options.product && productId) {
    if (!visibleFaqs) page.mainEntity = { '@id': productId };
    graph.push({
      '@type': 'Product',
      '@id': productId,
      name: options.product.title,
      description: options.product.description,
      url: canonicalUrl(options.product.publicPath),
      image: new URL(options.product.hero.socialImage, site.url).href,
      category: options.product.positioning,
      brand: { '@id': personId },
      mainEntityOfPage: { '@id': pageId },
    });
  }

  if (options.breadcrumbs?.length) {
    const breadcrumbId = `${url}#breadcrumb`;
    page.breadcrumb = { '@id': breadcrumbId };
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': breadcrumbId,
      itemListElement: options.breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: canonicalUrl(item.href),
      })),
    });
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

export function serializeJsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}
