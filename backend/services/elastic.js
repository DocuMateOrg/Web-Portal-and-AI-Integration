const { Client } = require('@elastic/elasticsearch');

const url = process.env.ELASTIC_URL || 'http://localhost:9200';
const client = new Client({ node: url });

const INDEX = process.env.ELASTIC_INDEX || 'documents';

async function indexDocument(id, doc) {
  return client.index({ index: INDEX, id: String(id), body: doc });
}

async function deleteDocument(id) {
  return client.delete({ index: INDEX, id: String(id) }).catch(err => {
    if (err && err.meta && err.meta.statusCode === 404) return null;
    throw err;
  });
}

async function ensureIndex() {
  const exists = await client.indices.exists({ index: INDEX });
  if (!exists) {
    await client.indices.create({ index: INDEX, body: {
      mappings: {
        properties: {
          filename: { type: 'keyword' },
          summary: { type: 'text' },
          extracted_text: { type: 'text' },
          tags: { type: 'keyword' }
        }
      }
    }});
  }
}

module.exports = { client, indexDocument, deleteDocument, ensureIndex };
