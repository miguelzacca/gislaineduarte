import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

const environmentKeys = ['PUBLIC_WHATSAPP', 'PUBLIC_EMAIL', 'PUBLIC_INSTAGRAM'];
const snapshotEnvironment = () => Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));
const originalEnvironment = snapshotEnvironment();
let importSequence = 0;

function applyEnvironment(values) {
  for (const key of environmentKeys) {
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
}

async function loadSite(overrides = {}) {
  const previous = snapshotEnvironment();
  applyEnvironment(overrides);
  try {
    const moduleURL = new URL('../../src/data/site.js', import.meta.url);
    moduleURL.searchParams.set('unit-test', String(++importSequence));
    return await import(moduleURL.href);
  } finally {
    applyEnvironment(previous);
  }
}

describe('configuração pública do site', { concurrency: false }, () => {
  afterEach(() => assert.deepEqual(snapshotEnvironment(), originalEnvironment, 'As variáveis de ambiente devem ser restauradas mesmo quando a validação falha.'));

  test('sem override usa o WhatsApp oficial atualizado', async () => {
    const { site, contactLink } = await loadSite();
    assert.equal(site.contact.whatsapp, '5547991913588');
    assert.equal(new URL(contactLink()).pathname, '/5547991913588');
  });

  test('número nacional de 11 dígitos ganha o código do Brasil', async () => {
    const { site, contactLink } = await loadSite({ PUBLIC_WHATSAPP: '47991913588' });
    assert.equal(site.contact.whatsapp, '5547991913588');
    const contact = new URL(contactLink('consulta-nutricional'));
    assert.equal(contact.origin, 'https://wa.me');
    assert.equal(contact.pathname, '/5547991913588');
    assert.match(contact.searchParams.get('text'), /consulta nutricional individual/);
  });

  test('número nacional de 10 dígitos também ganha o código do Brasil', async () => {
    const { site } = await loadSite({ PUBLIC_WHATSAPP: '4733334444' });
    assert.equal(site.contact.whatsapp, '554733334444');
  });

  test('formatação de telefone nacional é normalizada', async () => {
    const { site } = await loadSite({ PUBLIC_WHATSAPP: ' (47) 99191-3588 ' });
    assert.equal(site.contact.whatsapp, '5547991913588');
  });

  for (const phone of ['5547991913588', '+55 (47) 99191-3588']) {
    test(`telefone internacional preserva o país sem duplicar 55: ${phone}`, async () => {
      const { site } = await loadSite({ PUBLIC_WHATSAPP: phone });
      assert.equal(site.contact.whatsapp, '5547991913588');
    });
  }

  for (const phone of ['telefone', '123', '0047991913588', '55479919135881234']) {
    test(`telefone inválido interrompe a configuração: ${phone}`, async () => {
      await assert.rejects(loadSite({ PUBLIC_WHATSAPP: phone }), /PUBLIC_WHATSAPP/);
    });
  }

  test('e-mail válido aceita espaços externos e preserva o endereço', async () => {
    const { site } = await loadSite({ PUBLIC_EMAIL: ' contato@example.com ' });
    assert.equal(site.contact.email, 'contato@example.com');
  });

  for (const email of ['sem-arroba', 'nome@dominio', 'nome@example.com?x=1', 'nome sobrenome@example.com']) {
    test(`e-mail inválido interrompe a configuração: ${email}`, async () => {
      await assert.rejects(loadSite({ PUBLIC_EMAIL: email }), /PUBLIC_EMAIL/);
    });
  }

  for (const profile of ['https://instagram.com/perfil_de_teste/', 'https://www.instagram.com/perfil_de_teste/']) {
    test(`perfil Instagram HTTPS válido é preservado: ${profile}`, async () => {
      const { site } = await loadSite({ PUBLIC_INSTAGRAM: profile });
      assert.equal(site.contact.instagram, profile);
    });
  }

  test('URL de Instagram malformada é rejeitada', async () => {
    await assert.rejects(loadSite({ PUBLIC_INSTAGRAM: 'isto não é uma URL' }));
  });

  for (const profile of ['http://instagram.com/perfil_de_teste/', 'https://instagram.com.example.com/perfil_de_teste/']) {
    test(`Instagram com protocolo ou domínio não permitido é rejeitado: ${profile}`, async () => {
      await assert.rejects(loadSite({ PUBLIC_INSTAGRAM: profile }), /PUBLIC_INSTAGRAM/);
    });
  }
});
