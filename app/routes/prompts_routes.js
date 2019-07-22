const express = require('express')

const Prompts = require('../models/prompts')
const passport = require('passport')
const handle = require('../../lib/error_handler')
const customErrors = require('../../lib/custom_errors')
const handle404 = customErrors.handle404
const removeBlanks = require('../../lib/remove_blank_fields')
const requireOwnership = customErrors.requireOwnership
const requireToken = passport.authenticate('bearer', { session: false })

const router = express.Router()

router.get('/prompts', (req, res, next) => {
  Prompts.find()
    .then(prompts => {
      return prompts.map(prompt => prompt.toObject())
    })
    .then(prompts => res.status(200).json({ prompts: prompts }))
    .catch(err => handle(err, res))
})

router.post('/prompts', requireToken, (req, res, next) => {
  // set owner of new example to be current user
  req.body.prompt.owner = req.user.id

  Prompts.create(req.body.prompt)
    // respond to succesful `create` with status 201 and JSON of new "example"
    .then(prompt => {
      res.status(201).json({ prompt: prompt.toObject() })
    })
    // if an error occurs, pass it off to our error handler
    // the error handler needs the error message and the `res` object so that it
    // can send an error message back to the client
    .catch(next)
})

// DESTROY
// DELETE /examples/5a7db6c74d55bc51bdf39793
router.delete('/prompts/:id', requireToken, (req, res, next) => {
  Prompts.findById(req.params.id)
    .then(handle404)
    .then(prompt => {
      // throw an error if current user doesn't own `example`
      requireOwnership(req, prompt)

      // delete the example ONLY IF the above didn't throw
      prompt.remove()
    })
    // send back 204 and no content if the deletion succeeded
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

router.patch('/prompts/:id', requireToken, removeBlanks, (req, res, next) => {
  // if the client attempts to change the `owner` property by including a new
  // owner, prevent that by deleting that key/value pair
  delete req.body.prompt.owner

  Prompts.findById(req.params.id)
    .then(handle404)
    .then(prompt => {
      // pass the `req` object and the Mongoose record to `requireOwnership`
      // it will throw an error if the current user isn't the owner
      requireOwnership(req, prompt)
      // pass the result of Mongoose's `.update` to the next `.then`
      return prompt.update(req.body.prompt)
    })
    // if that succeeded, return 204 and no JSON
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

module.exports = router
