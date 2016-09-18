import test from 'ava'
import loopback from 'loopback'
import validator from '../src'

test.beforeEach(t => {
  const app = t.context.app = loopback()
  app.set('legacyExplorer', false)

  const ds = loopback.createDataSource('memory')

  const Post = ds.createModel('post', {title: String, content: String})
  const Comment = ds.createModel('comment', {title: String, comment: String})

  app.model(Post)
  app.model(Comment)

  Comment.belongsTo(Post)
  Post.hasMany(Comment)

  app.use(loopback.rest())
})

test('no `data` argument given', t => {
  t.plan(1)
  const { Post } = t.context.app.models
  let data
  const options = {requireId: false}

  const testValidator = () => validator(data, Post, options)

  t.throws(testValidator)
})

test('no `data.data` argument given', t => {
  t.plan(1)
  const { Post } = t.context.app.models
  const data = {}
  const options = {requireId: false}

  const testValidator = () => validator(data, Post, options)

  t.throws(testValidator)
})

test('no `data.data.type` argument given', t => {
  t.plan(1)
  const { Post } = t.context.app.models
  const data = {data: {}}
  const options = {requireId: false}

  const testValidator = () => validator(data, Post, options)

  t.throws(testValidator)
})

test('`data.data.type` argument not given as a string', t => {
  t.plan(1)
  const { Post } = t.context.app.models
  const data = {data: {type: 1}}
  const options = {requireId: false}

  const testValidator = () => validator(data, Post, options)

  t.throws(testValidator)
})

test('`data.data.id` argument not given when options.requireId is false', t => {
  t.plan(2)
  const { Post } = t.context.app.models
  const data = {data: {type: 'posts'}}
  const options = {requireId: false}

  const valid = validator(data, Post, options)

  t.is(valid, true)
  t.truthy(!data.data.id)
})

test('no `data.data.id` argument given when options.requireId is true', t => {
  t.plan(1)
  const { Post } = t.context.app.models
  const data = {data: {type: 'posts'}}

  const testValidator = () => validator(data, Post)

  t.throws(testValidator)
})

test('`data.data.id` argument given as invalid type when options.requireId is true', t => {
  t.plan(1)
  const { Post } = t.context.app.models
  const data = {data: {type: 'posts', id: 3}}

  const testValidator = () => validator(data, Post)

  t.throws(testValidator)
})

test('`data.data.id` argument given as valid type when options.requireId is true', t => {
  t.plan(1)
  const { Post } = t.context.app.models
  const data = {data: {type: 'posts', id: '3'}}

  const valid = validator(data, Post)

  t.is(valid, true)
})

test('invalid key in JSONAPI given (1)', t => {
  t.plan(1)
  const { Post } = t.context.app.models
  const data = {data: {type: 'posts', iNvALiDKeY: '2'}}
  const options = {requireId: false}

  const testValidator = () => validator(data, Post, options)

  t.throws(testValidator)
})

test('invalid key in JSONAPI given (2)', t => {
  t.plan(1)
  const { Post } = t.context.app.models
  const data = {data: {type: 'posts', id: '2', attributes: {}, other: {}}}

  const testValidator = () => validator(data, Post)

  t.throws(testValidator)
})

test('valid JSONAPI given, advanced payload', t => {
  t.plan(1)
  const { Post } = t.context.app.models
  const data = {data: {type: 'posts', id: '2', attributes: {}, meta: {}, relationships: {}}}

  const valid = validator(data, Post)

  t.is(valid, true)
})

test('invalid key in JSONAPI attributes hash', t => {
  t.plan(1)
  const { Post } = t.context.app.models
  const data = {data: {type: 'posts', id: '2', attributes: {other: true}}}

  const testValidator = () => validator(data, Post)

  t.throws(testValidator)
})

test('valid keys in JSONAPI attributes hash', t => {
  t.plan(1)
  const { Post } = t.context.app.models
  const data = {data: {type: 'posts', id: '2', attributes: {title: 'my title', content: 'my content'}}}

  const valid = validator(data, Post)

  t.is(valid, true)
})

test('valid keys in JSONAPI relationships hash (1)', t => {
  t.plan(1)
  const { Post } = t.context.app.models
  const data = {data: {type: 'posts', id: '2', relationships: {comments: {}}}}

  const valid = validator(data, Post)

  t.is(valid, true)
})

test('valid keys in JSONAPI relationships hash (1)', t => {
  t.plan(1)
  const { Comment } = t.context.app.models
  const data = {data: {type: 'comments', id: '1', relationships: {post: {}}}}

  const valid = validator(data, Comment)

  t.is(valid, true)
})

test('invalid key in JSONAPI relationships hash', t => {
  t.plan(1)
  const { Post } = t.context.app.models
  const data = {data: {type: 'posts', id: '2', relationships: {other: true}}}

  const testValidator = () => validator(data, Post)

  t.throws(testValidator)
})

test('invalid type of JSONAPI relationships.data', t => {
  t.plan(1)
  const { Post } = t.context.app.models
  const data = {data: {type: 'posts', id: '2', relationships: {comments: {data: {}}}}}

  const testValidator = () => validator(data, Post)

  t.throws(testValidator)
})

test('valid type of JSONAPI relationships.data (1)', t => {
  t.plan(1)
  const { Comment } = t.context.app.models
  const data = {data: {type: 'comments', id: '2', relationships: {post: {data: null}}}}

  const valid = validator(data, Comment)

  t.is(valid, true)
})

test('valid type of JSONAPI relationships.data (2)', t => {
  t.plan(1)
  const { Post } = t.context.app.models
  const data = {data: {type: 'posts', id: '2', relationships: {comments: {data: []}}}}

  const valid = validator(data, Post)

  t.is(valid, true)
})

test('required fields', t => {
  t.plan(1)
  const ds = loopback.createDataSource('memory')
  const Post = ds.createModel('post', {title: {type: String, required: true}})
  const data = {data: {type: 'posts', id: '2', attributes: {}}}

  const testValidator = () => validator(data, Post)

  t.throws(testValidator)
})
