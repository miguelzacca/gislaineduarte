import assert from 'node:assert/strict';
import { test } from 'node:test';
import { site, services, publicRoutes } from '../../src/data/site.js';
import { buildJsonLd, buildMetadata } from '../../src/lib/seo.js';
import { buildLlms } from '../../src/lib/discovery.js';

test('identidade separa nome profissional completo dos nomes da marca', () => {
  assert.equal(site.fullName, 'Gislaine Muller Duarte');
  assert.equal(site.name, 'Gislaine Duarte');
  assert.equal(site.familiarName, 'Nutri Gi');
  assert.equal(site.registration, 'CRN-10 nº 22562');
  assert.equal(site.registrationDetails.council, 'CRN-10');
  assert.equal(site.registrationDetails.number, '22562');
});

test('todas as rotas conectam a mesma pessoa ao registro profissional confirmado', () => {
  for (const path of publicRoutes) {
    const graph = buildJsonLd(path, site.title, site.description)['@graph'];
    const person = graph.find(entity => entity['@type'] === 'Person');
    assert.equal(person['@id'], `${site.url}/#gislaine-duarte`);
    assert.equal(person.name, site.fullName);
    assert.deepEqual(person.alternateName, [site.name, site.familiarName]);
    assert.deepEqual(person.identifier, {
      '@type': 'PropertyValue', propertyID: 'CRN-10', value: '22562', name: 'Registro profissional de nutricionista',
    });
    assert.equal(graph.find(entity => entity['@type'] === 'WebSite').publisher['@id'], person['@id']);
  }
});

test('credencial é um registro profissional, sem títulos ou situação cadastral presumidos', () => {
  const person = buildJsonLd('/', site.title, site.description)['@graph'][0];
  const credential = person.hasCredential;
  assert.equal(credential['@type'], 'EducationalOccupationalCredential');
  assert.equal(credential.credentialCategory, 'Registro profissional');
  assert.equal(credential.name, site.registration);
  assert.equal(credential.recognizedBy.url, 'https://crn10.org.br/');
  assert.deepEqual(credential.identifier, person.identifier);
  assert.equal(credential.validFrom, undefined);
  assert.equal(credential.expires, undefined);
  assert.equal(person.honorificPrefix, undefined);
});

test('consulta e ciclos apontam para a identidade profissional única', () => {
  for (const service of services) {
    const graph = buildJsonLd(service.href, service.title, service.summary, { service })['@graph'];
    const entity = graph.find(item => item['@type'] === 'Service');
    assert.equal(entity.provider['@id'], graph[0]['@id']);
    assert.equal(entity.offers, undefined);
  }
});

test('dados publicados não contêm documentos pessoais, nascimento, idade ou endereço inferido', () => {
  const forbidden = /^(cpf|taxID|vatID|birthDate|birthPlace|age|address|geo)$/i;
  function inspect(value) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      assert.equal(forbidden.test(key), false, `Campo privado/não confirmado: ${key}`);
      inspect(child);
    }
  }
  inspect(site);
  for (const path of publicRoutes) inspect(buildJsonLd(path, site.title, site.description));
});

test('busca e descoberta textual usam os dados públicos consistentes', () => {
  const metadata = buildMetadata('/', site.title, site.description);
  assert.ok(metadata.description.includes(site.fullName));
  assert.ok(metadata.description.includes(site.registration));
  const text = buildLlms();
  assert.ok(text.includes(site.fullName));
  assert.ok(text.includes(site.registration));
  assert.ok(text.includes('em andamento'));
  assert.equal(new URL(site.registrationDetails.directoryUrl).hostname, 'crn-sc.implanta.net.br');
  assert.equal(new URL(site.registrationDetails.directoryUrl).search, '');
});
