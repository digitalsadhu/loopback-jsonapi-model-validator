'use strict'

const _ = require('lodash')
const Validator = require('jsonschema').Validator
var validator = new Validator()
const schemaTypes = require('loopback-jsonschema-types')

function primaryKeyForModel (model) {
  return model.getIdName()
}

function foreignKeysForModel (model) {
  const relations = model.relations
  const keys = []
  Object.keys(relations)
    .filter(relationName => relations[relationName].type === 'belongsTo')
    .forEach(relationName => {
      keys.push(relations[relationName].keyFrom)
      if (relations[relationName].polymorphic) {
        keys.push(relations[relationName].polymorphic.discriminator)
      }
    })
  return keys
}

module.exports = (data, model, options = {requireId: true, allowForeignKeys: false, allowPrimaryKeys: false}) => {
  let shouldCleanupId = false
  if (options.requireId === false) {
    shouldCleanupId = true
    data.data.id = '1'
  }

  const schema = {
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

  const properties = model.definition.rawProperties
  Object.keys(properties).forEach(propertyName => {
    const property = properties[propertyName]
    const attributes = schema.properties.data.properties.attributes

    const pk = primaryKeyForModel(model)
    const fks = foreignKeysForModel(model)

    if (options.allowPrimaryKeys !== true) {
      if (pk === propertyName) return
    }

    if (options.allowForeignKeys !== true) {
      if (_.includes(fks, propertyName)) return
    }

    attributes.properties = attributes.properties || {}
    attributes.properties[propertyName] = schemaTypes(property)

    if (property.required === 'true') {
      attributes.required = attributes.required || []
      attributes.required.push(propertyName)
    }
  })
  schema.properties.data.properties.attributes.additionalProperties = false

  const relations = model.relations
  Object.keys(relations).forEach(relationName => {
    const relation = relations[relationName]
    const relationships = schema.properties.data.properties.relationships

    relationships.properties = relationships.properties || {}
    relationships.properties[relationName] = {
      type: 'object',
      properties: {links: {type: 'object'}, meta: {type: 'object'}}
    }

    if (relation.type === 'belongsTo') {
      relationships.properties[relationName].properties.data = {
        anyOf: [
          {type: 'null'},
          {
            type: 'object',
            required: ['id', 'type'],
            additionalProperties: false,
            properties: {id: {type: 'string'}, type: {type: 'string'}, meta: {type: 'object'}}
          }
        ]
      }
    } else {
      relationships.properties[relationName].properties.data = {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'type'],
          additionalProperties: false,
          properties: {id: {type: 'string'}, type: {type: 'string'}, meta: {type: 'object'}}
        },
        uniqueItems: true
      }
    }
  })
  schema.properties.data.properties.relationships.additionalProperties = false
  // console.log(JSON.stringify(schema, null, 2))

  const validation = validator.validate(data, schema)

  if (!validation.valid) {
    throw new Error(validation.errors)
  }

  if (options.requireId === false && shouldCleanupId) {
    delete data.data.id
  }

  return true
}
