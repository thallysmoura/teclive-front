import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { companyToForm, EMPTY_COMPANY, lookupCompany, lookupPostalCode, type CompanyProfile } from './company';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test('company form removes metadata and normalizes absent images for saving', () => {
  assert.deepEqual(companyToForm(null), EMPTY_COMPANY);
  const result = companyToForm({ ...EMPTY_COMPANY, legalName: 'Empresa', logoDataUrl: null, boletoLogoDataUrl: null, id: 'main', createdAt: 'date', updatedAt: 'date' } as CompanyProfile);
  assert.equal(result.legalName, 'Empresa');
  assert.equal(result.logoDataUrl, '');
  assert.equal('id' in result, false);
  assert.equal('updatedAt' in result, false);
});
test('CNPJ lookup sanitizes the number and does not overwrite fields absent from the provider', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://brasilapi.com.br/api/cnpj/v1/27037655000190');
    assert.equal(options?.credentials, 'omit');
    return Response.json({ razao_social: 'Empresa', nome_fantasia: '', email: null, cep: '69044-110', cnae_fiscal: 4321500, uf: 'AM' });
  };
  assert.deepEqual(await lookupCompany('27.037.655/0001-90'), { legalName: 'Empresa', postalCode: '69044110', cnae: '4321500', state: 'AM' });
});
test('CEP lookup returns only address fields and reports provider errors', async () => {
  const address = await lookupPostalCode('69044-110', async (value, options) => {
    assert.equal(value, '69044110');
    assert.deepEqual(options, { timeout: 8000, providers: ['brasilapi', 'viacep'] });
    return { cep: '69044110', street: 'Rua Teste', neighborhood: 'Centro', city: 'Manaus', state: 'AM', service: 'viacep' };
  });
  assert.deepEqual(address, { street: 'Rua Teste', district: 'Centro', city: 'Manaus', state: 'AM' });
  await assert.rejects(lookupPostalCode('69044110', async () => { throw new Error('provider unavailable'); }), /preencha os dados manualmente/);
  await assert.rejects(lookupPostalCode('123'), /8 dígitos/);
});
test('generic CEP results preserve manually entered street and neighborhood', async () => {
  assert.deepEqual(await lookupPostalCode('69044110', async () => ({ cep: '69044110', street: '', neighborhood: '', city: 'Manaus', state: 'AM', service: 'brasilapi' })), { city: 'Manaus', state: 'AM' });
});
test('CNPJ lookup preserves the leading zero of numeric CNAE codes', async () => {
  globalThis.fetch = async () => Response.json({ cnae_fiscal: 111301 });
  assert.deepEqual(await lookupCompany('27037655000190'), { cnae: '0111301' });
});
