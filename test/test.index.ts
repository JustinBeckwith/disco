import * as assert from 'assert';
import * as fs from 'fs';
import * as nock from 'nock';
import * as path from 'path';
import * as url from 'url';

import {disco, Disco} from '../src';

nock.disableNetConnect();

const fakeSchemasPath = path.resolve('test/fixtures/fakeSchemas.json');
const fakeSchemaPath = path.resolve('test/fixtures/fakeSchema.json');
const fakeFragmentPath = path.resolve('test/fixtures/fakeFragment.json');

function mockSchemas() {
  return nock('https://www.googleapis.com')
      .get('/discovery/v1/apis/')
      .replyWithFile(200, fakeSchemasPath);
}

function mockSchema() {
  return [
    nock('https://funk.googleapis.com')
        .get('/$discovery/rest?version=v1')
        .replyWithFile(200, fakeSchemaPath),
    nock('https://supersecret.googleapis.com')
        .get('/$discovery/rest?version=v1')
        .reply(404)
  ];
}

function mockFragments() {
  return [
    nock('https://storage.googleapis.com')
        .get('/apisnippets-staging/public/funk/v1/0/funk.sites.get.frag.json')
        .replyWithFile(200, fakeFragmentPath),
    nock('https://storage.googleapis.com')
        .get(
            '/apisnippets-staging/public/funk/v1/0/funk.sites.delete.frag.json')
        .reply(403)
  ];
}

function mockAllTheThings() {
  return [mockSchemas(), ...mockSchema(), ...mockFragments()];
}

it('should export an instance and a class type', () => {
  assert(disco);
  const d = new Disco();
  assert(d.download);
});

it('should download the discovery doc', async () => {
  const scopes = mockAllTheThings();
  const schemas = await disco.download();
  scopes.forEach(s => assert(s.isDone()));
  const schema = schemas.items[0];
  assert(schema.description);
});

it('should download all api docs in the discovery', async () => {
  const scopes = mockAllTheThings();
  const schemas = await disco.download();
  scopes.forEach(s => assert(s.isDone()));
  assert.strictEqual(schemas.items.length, 1);
});

it('should download code fragments', async () => {
  const scopes = mockAllTheThings();
  const schemas = await disco.download();
  scopes.forEach(s => assert(s.isDone()));
  const schema = schemas.items[0];
  const fragment = schema.resources!['sites'].methods!['get']!.fragment;
  assert(fragment);
});

it('should raise events for failed schemas', async () => {
  const scopes = mockAllTheThings();
  const disco = new Disco();
  let errorCount = 0;
  disco.on('schemaError', err => errorCount++);
  const schemas = await disco.download();
  scopes.forEach(s => assert(s.isDone()));
  assert.strictEqual(1, errorCount, 'Wrong # of errrrrrors');
});

it('should write a file if told to do so', async () => {
  const exportPath = 'export.json';
  const scopes = mockAllTheThings();
  const schemas = await disco.download({exportPath});
  scopes.forEach(s => assert(s.isDone()));
  const exists = fs.existsSync(exportPath);
  assert.equal(exists, true);
});
