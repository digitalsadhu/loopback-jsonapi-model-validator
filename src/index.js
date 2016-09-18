'use strict'

const _ = require('lodash')
const {get, set} = _
const Validator = require('jsonschema').Validator
const validator = new Validator()
const schemaTypes = require('loopback-jsonschema-types')

function primaryKeyForModel (model) {
  return model.getIdName()
}

function foreignKeysForRelation (relation) {
  const {type, keyFrom, polymorphic} = relation
  if (type !== 'belongsTo') return []
  let descriminator = get(relation, 'polymorphic.discriminator')
  if (polymorphic) return [keyFrom, descriminator]
  return [keyFrom]
}

function foreignKeysForModel (model) {
  const relations = model.relations
  return Object.keys(relations).reduce((prev, curr) => {
    return prev.concat(foreignKeysForRelation(get(relations, curr)))
  }, [])
}

function baseSchema () {
  return {
    type: 'object',
    required: ['data'],
    properties: {
      data: {
        type: 'object',
        required: ['id', 'type'],
        properties: {
          id: {type: 'string'},
          type: {type: 'string'},
          attributes: {type: 'object'},
          relationships: {type: 'object'},
          meta: {type: 'object'},
          links: {type: 'object'}
        },
        additionalProperties: false
      },
      meta: {type: 'object'},
      links: {type: 'object'}
    },
    additionalProperties: false
  }
}

function addAttributeSchemas (model, schema, options) {
  const primaryKey = primaryKeyForModel(model)
  const foreignKeys = foreignKeysForModel(model)
  const properties = get(model, 'definition.rawProperties')
  Object.keys(properties).forEach(propertyName => {
    const property = get(properties, propertyName)
    const attributes = get(schema, 'properties.data.properties.attributes')

    if (options.allowPrimaryKeys !== true) {
      if (primaryKey === propertyName) return
    }

    if (options.allowForeignKeys !== true) {
      if (_.includes(foreignKeys, propertyName)) return
    }

    set(attributes, `properties.${propertyName}`, schemaTypes(property))

    if (property.required === true) {
      attributes.required = attributes.required || []
      attributes.required.push(propertyName)
    }
  })
  set(schema, 'properties.data.properties.attributes.additionalProperties', false)
}

function addRelationsSchemas (model, schema, options) {
  const {relations} = model
  Object.keys(relations).forEach(relationName => {
    const relation = get(relations, relationName)
    const relationships = get(schema, 'properties.data.properties.relationships')

    set(relationships, `properties.${relationName}`, {
      type: 'object',
      properties: {links: {type: 'object'}, meta: {type: 'object'}}
    })

    if (relation.type === 'belongsTo') {
      set(relationships, `properties.${relationName}.properties.data`, {
        anyOf: [
          {type: 'null'},
          {
            type: 'object',
            required: ['id', 'type'],
            additionalProperties: false,
            properties: {id: {type: 'string'}, type: {type: 'string'}, meta: {type: 'object'}}
          }
        ]
      })
    } else {
      set(relationships, `properties.${relationName}.properties.data`, {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'type'],
          additionalProperties: false,
          properties: {id: {type: 'string'}, type: {type: 'string'}, meta: {type: 'object'}}
        },
        uniqueItems: true
      })
    }
  })
  set(schema, 'properties.data.properties.relationships.additionalProperties', false)
}

module.exports = (data = {}, model, options = {requireId: true, allowForeignKeys: false, allowPrimaryKeys: false}) => {
  data = JSON.parse(JSON.stringify(data))

  // HACK: Setup a fake id so that jsonschema won't fail on missing id.
  if (options.requireId === false) {
    set(data, 'data.id', '1')
  }

  const schema = baseSchema()
  addAttributeSchemas(model, schema, options)
  addRelationsSchemas(model, schema, options)

  const validation = validator.validate(data, schema)
  if (!validation.valid) throw new Error(validation.errors)

  return true
}
