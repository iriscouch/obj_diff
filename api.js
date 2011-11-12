// The obj_diff API
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

require('defaultable').def(module,
  {
  }, function(module, exports, DEFS, require) {

var lib = require('./lib')
  , diff = require('./lib/diff')
  , diffs = require('./lib/diffs')
  ;

exports = module.exports = diff.diff;

exports.Diff = diffs.Diff;

var aliases = ['ANY', 'GONE', 'TRUTHY', 'FALSY', 'TIMESTAMP', 'LESSER', 'GREATER'];
aliases.forEach(function(label) {
  exports[label] = lib[label];
})

}) // defaultable
