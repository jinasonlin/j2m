const Ajv = require('ajv');
const schema = require('../spec/json-schema-draft-07-magic.json');

let validator;

function createInstance() {
  const ajv = new Ajv({
    meta: false,
    // jsonPointers: true,
    allErrors: true,
    verbose: true,
  });

  ajv.addMetaSchema(schema);

  ajv.addFormat('image', () => true);

  return ajv;
}

function getInstance() {
  if (!validator) {
    validator = createInstance();
  }
  return validator;
}

exports.Ajv = Ajv;
exports.getInstance = getInstance;
