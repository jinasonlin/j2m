const assert = require('assert');
const { validateSchema, validateJSON } = require('..');
const schema = require('../spec/json-schema-draft-07.json');

const getFirstErrorMessage = (errors) => errors[0] ? errors[0].message : '';

assert(!validateSchema(schema).length, 'schema validate fail');

const jSchema = {
  "type": "object",
  "properties": {
    "a": {
      "type": "number"
    }
  }
};

const r2 = validateJSON(jSchema, { a: 123 });
assert(!r2.length, `json validate fail: [${getFirstErrorMessage(r2)}`);
