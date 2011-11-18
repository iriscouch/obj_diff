// couchdb packager
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var real_require = require;
var defaultable = require('defaultable');

defaultable(module,
  {
  }, function(module, exports, DEFS, require) {

var fs = require('fs')
  , lib = require('../lib')
  , assert = require('assert')


exports.install = install;


// Load obj_diff into an object suitable to be a CouchDB design document.
function install(doc, opts) {
  assert.equal(lib.typeOf(doc), 'object', 'Document object required');
  opts = defaultable.merge(opts || {}, DEFS);

  var pkg = require('../package');
  doc.version = pkg.version;

  doc.path = read('CouchDB/path.js');
  doc.util = read('CouchDB/util.js');
  doc.assert = read('CouchDB/assert.js');
  doc.console = read('CouchDB/console.js');

  var defaultable_path = real_require.resolve('defaultable');
  doc.defaultable = read(defaultable_path, 'absolute');

  doc.obj_diff = read('api.js');
  doc.lib = { 'index': read('lib/index.js')
            , 'diffs': read('lib/diffs.js')
            , 'rules': read('lib/rules.js')
            , 'couchdb': "exports.install = function() { throw new Error('Not implemented in CouchDB yet') }"
            }

  return doc;
}

function read(path, type) {
  if(type != 'absolute')
    path = __dirname + '/../' + path;

  return fs.readFileSync(path, 'utf8');
}

}) // defaultable
