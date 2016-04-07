import Debug from 'debug'
import Promise from 'bluebird'
import { get, mapValues, values } from 'lodash'
import jsonStringifySafe from 'json-stringify-safe'

let debug = Debug('pr')

export function EndError(value) {
   Error.captureStackTrace(this)
   this.value = value
   this.name = "EndError"
}
EndError.prototype = Object.create(Error.prototype)

export function returnError (err) {
  return err
}

export function ifThrow (condition, errorMessage) {
  if (condition) throw new Error(errorMessage)
  return true
}

export let ifFalseThrow = (message) => {
  return function (val) {
    if (!val) throw new Error(message)
    return val
  }
}

export let ifTrueThrow = (message) => {
  return function (val) {
    if (val) throw new Error(message)
    return val
  }
}

export function log (message) {
  console.log(message)
  return true
}

export default function promiseRipple (name, props) {
  name = (typeof name === 'string') ? name : false
  props = (typeof name !== 'string') ? name : props

  props = mapValues(props, function (prop, key) {
    prop.key = key
    return prop
  })

  function setValue (actionKey, value, method, capturedThrow) {
    let msg = `resolving "${name}" (via ${method}) ${actionKey} to ${jsonStringifySafe(value)}`
    if (capturedThrow) msg += ` and captured throw`
    debug(msg)
    props[actionKey] = value
  }

  function returnOrBreakIfTrue (actionKey, CustomErrorObj, returnObjValue) {
    return (value) => Promise.resolve(value).then(result => {
      let method = (returnObjValue) ? 'returnIfTrue' : 'breakIfTrue'
      let capturedThrow = false
      if (result instanceof Error) {
        capturedThrow = true
        result = result.message || 'No Message'
      }
      setValue(actionKey, result, method, capturedThrow)
      if (result && !capturedThrow && returnObjValue) throw new CustomErrorObj(result)
      if (result && !capturedThrow && !returnObjValue) throw new CustomErrorObj()
      return result
    })
  }

  return Promise.reduce(values(props), function (result, action) {
    if (typeof action !== 'function') throw new Error('property values must be functions')
    let helpers = {
      returnIfTrue: returnOrBreakIfTrue(action.key, EndError, true), // returns value if it's true
      breakIfTrue: returnOrBreakIfTrue(action.key, EndError) // breaks (stops ripple) if true
    }
    return Promise.resolve(action(props, helpers)).then(result => {
      setValue(action.key, result, 'normal')
      return result
    })
  }, null)
  .then(function () {
    return props
  })
  .catch(EndError, function (err) {
    if (err.value) return err.value
    return props
  })
}
