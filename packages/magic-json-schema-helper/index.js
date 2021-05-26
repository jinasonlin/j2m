const validator = require('./lib/validator');

exports.validator = validator;

const filterErrors = (errors) => {
  let newErrors = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const err of errors) {
    const { dataPath } = err;
    let children = [];
    newErrors = newErrors.filter((oldError) => {
      if (oldError.dataPath.includes(dataPath)) {
        if (oldError.children) {
          children = children.concat(oldError.children.slice(0));
        }
        oldError.children = undefined;
        children.push(oldError);
        return false;
      }
      return true;
    });
    if (children.length) {
      err.children = children;
    }
    newErrors.push(err);
  }

  return newErrors;
};

exports.validateSchema = (schema) => {
  const instance = validator.getInstance();
  const valid = instance.validateSchema(schema);
  return valid ? [] : filterErrors(instance.errors);
};

exports.validateJSON = exports.validate = (schema, document) => {
  const instance = validator.getInstance();
  const valid = instance.validate(schema, document);
  return valid ? [] : filterErrors(instance.errors);
};
