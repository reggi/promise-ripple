'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ifTrueThrow = exports.ifFalseThrow = undefined;
exports.EndError = EndError;
exports.returnError = returnError;
exports.ifThrow = ifThrow;
exports.log = log;
exports.default = promiseRipple;

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _lodash = require('lodash');

var _jsonStringifySafe = require('json-stringify-safe');

var _jsonStringifySafe2 = _interopRequireDefault(_jsonStringifySafe);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var debug = (0, _debug2.default)('pr');

function EndError(value) {
  Error.captureStackTrace(this);
  this.value = value;
  this.name = "EndError";
}
EndError.prototype = Object.create(Error.prototype);

function returnError(err) {
  return err;
}

function ifThrow(condition, errorMessage) {
  if (condition) throw new Error(errorMessage);
  return true;
}

var ifFalseThrow = exports.ifFalseThrow = function ifFalseThrow(message) {
  return function (val) {
    if (!val) throw new Error(message);
    return val;
  };
};

var ifTrueThrow = exports.ifTrueThrow = function ifTrueThrow(message) {
  return function (val) {
    if (val) throw new Error(message);
    return val;
  };
};

function log(message) {
  console.log(message);
  return true;
}

function promiseRipple(name, props) {
  name = typeof name === 'string' ? name : false;
  props = typeof name !== 'string' ? name : props;

  props = (0, _lodash.mapValues)(props, function (prop, key) {
    prop.key = key;
    return prop;
  });

  function setValue(actionKey, value, method, capturedThrow) {
    var msg = 'resolving "' + name + '" (via ' + method + ') ' + actionKey + ' to ' + (0, _jsonStringifySafe2.default)(value);
    if (capturedThrow) msg += ' and captured throw';
    debug(msg);
    props[actionKey] = value;
  }

  function returnOrBreakIfTrue(actionKey, CustomErrorObj, returnObjValue) {
    return function (value) {
      return _bluebird2.default.resolve(value).then(function (result) {
        var method = returnObjValue ? 'returnIfTrue' : 'breakIfTrue';
        var capturedThrow = false;
        if (result instanceof Error) {
          capturedThrow = true;
          result = result.message || 'No Message';
        }
        setValue(actionKey, result, method, capturedThrow);
        if (result && !capturedThrow && returnObjValue) throw new CustomErrorObj(result);
        if (result && !capturedThrow && !returnObjValue) throw new CustomErrorObj();
        return result;
      });
    };
  }

  return _bluebird2.default.reduce((0, _lodash.values)(props), function (result, action) {
    if (typeof action !== 'function') throw new Error('property values must be functions');
    var helpers = {
      returnIfTrue: returnOrBreakIfTrue(action.key, EndError, true), // returns value if it's true
      breakIfTrue: returnOrBreakIfTrue(action.key, EndError) // breaks (stops ripple) if true
    };
    return _bluebird2.default.resolve(action(props, helpers)).then(function (result) {
      setValue(action.key, result, 'normal');
      return result;
    });
  }, null).then(function () {
    return props;
  }).catch(EndError, function (err) {
    if (err.value) return err.value;
    return props;
  });
}