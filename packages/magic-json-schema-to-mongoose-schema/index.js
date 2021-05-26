/* eslint-disable no-return-assign,no-nested-ternary,no-cond-assign */
const _ = require('lodash');
const mongoose = require('mongoose');

const typeStringToMongooseType = {
  string: String,
  boolean: Boolean,
  number: Number,
  integer: Number,
};

const typeRefToMongooseType = {
  '#/definitions/mixed': mongoose.Schema.Types.Mixed,
  '#/definitions/objectid': mongoose.Schema.Types.ObjectId,
  '#/definitions/dateOrDatetime': Date,
};

const typeOfMongooseType = _.union(_.values(typeStringToMongooseType), _.values(typeRefToMongooseType));

const addRequired = function (required, jsonSchema, key) {
  return required.indexOf(key) >= 0
    ? !_.isPlainObject(jsonSchema)
      ? {
        type: jsonSchema,
        required: true,
      }
      : _.has(jsonSchema, 'type')
        ? _.assign(jsonSchema, { required: true })
        : jsonSchema
    : jsonSchema;
};

// noinspection ReservedWordAsName
const schemaParamsToMongoose = {
  /**
   * default value
   */
  default(_default) {
    return { default: _default };
  },
  /**
   * populate ref
   */
  ref(ref) {
    return { ref };
  },
  /**
   * pattern for value to match
   */
  pattern(pattern) {
    return { match: RegExp(pattern) };
  },
  type(type) {
    return { type: typeStringToMongooseType[type] };
  },
  minLength(min) {
    return { minlength: min };
  },
  maxLength(max) {
    return { maxlength: max };
  },
  minimum(min) {
    return { min };
  },
  maximum(max) {
    return { max };
  },
  enum(members) {
    return { enum: members };
  },
};

const toMongooseParams = function (acc, val, key) {
  let func;
  return (func = schemaParamsToMongoose[key]) ? _.assign(acc, func(val)) : acc;
};

const unsupportedRefValue = function (jsonSchema) {
  throw new Error(`Unsupported $ref value: ${jsonSchema.$ref}`);
};

const unsupportedJsonSchema = function (jsonSchema) {
  throw new Error(`Unsupported JSON schema: '${JSON.stringify(jsonSchema)}'`);
};

const convert = function (jsonSchema, { definitions } = {}) {
  // draft-07: {} -> true
  if (jsonSchema === true) {
    return typeRefToMongooseType['#/definitions/mixed'];
  }

  if (!_.isPlainObject(jsonSchema)) {
    unsupportedJsonSchema(jsonSchema);
  }

  definitions = { ...definitions, ...jsonSchema.definitions };

  const { $ref, required, type, format, properties, items, ...jsonSchemaPrune } = jsonSchema;
  // ignore root $ref '#'
  const isRef = !_.isEmpty($ref) && $ref !== '#';
  const refKey = isRef ? $ref.split(/[#/]/).pop() : '';
  const refSchema = _.isEmpty(definitions) ? false : definitions[refKey];

  const isTypeId = type === 'string' && format === 'objectid';
  const isTypeDate = type === 'string' && (format === 'date' || format === 'date-time');

  switch (true) {
    case isRef: {
      return refSchema
        ? convert(refSchema, { definitions })
        : unsupportedRefValue(jsonSchema);
    }
    case isTypeId:
      return _.reduce(jsonSchemaPrune, toMongooseParams, {
        type: typeRefToMongooseType['#/definitions/objectid'],
      });
    case isTypeDate:
      return _.reduce(jsonSchemaPrune, toMongooseParams, {
        type: typeRefToMongooseType['#/definitions/dateOrDatetime'],
      });
    case _.has(typeStringToMongooseType, type):
      return _.reduce(jsonSchema, toMongooseParams, {});
    case type === 'object' && _.isEmpty(properties):
      return typeRefToMongooseType['#/definitions/mixed'];
    case type === 'object' && !_.isEmpty(properties): {
      let converted;
      return (
        converted = _.mapValues(properties, (value) => convert(value, { definitions })),
        required ? _.mapValues(converted, (value, key) => addRequired(required, value, key)) : converted
      );
    }
    case type === 'array' && !_.isEmpty(items): {
      let converted;
      return [(
        converted = convert(items, { definitions }),
        _.includes(typeOfMongooseType, converted) ? converted : _.assign(converted, { _id: false })
        // _.includes(typeOfMongooseType, converted)
        //   ? converted
        //   : _.includes(typeOfMongooseType, converted.type)
        //     ? converted.type
        //     : converted
      )];
    }
    case type === 'array' && _.isEmpty(items):
      return [];
    case type === 'json':
      return typeRefToMongooseType['#/definitions/mixed'];
    case !type:
      return typeRefToMongooseType['#/definitions/mixed'];
    default:
      unsupportedJsonSchema(jsonSchema);
  }
};

module.exports = (jsonSchema) => convert(jsonSchema);
