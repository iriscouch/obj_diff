// Node-like assert module

module.exports = { 'ok'   : ok
                 , 'equal': equal
                 };

function ok(a, message) {
  return equal(a, true, message || 'assert.ok');
}

function equal(a, b, message) {
  var er;
  message = message || 'assert.equal';

  if(a != b) {
    er = new Error(message + ' got=' + JSON.stringify(a) + ' want=' + JSON.stringify(b));
    throw er;
  }
}
