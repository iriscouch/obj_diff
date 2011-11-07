// obj_diff API tests
//
// Copyright 2011 Iris Couch
//
//    Licensed under the Apache License, Version 2.0 (the "License");
//    you may not use this file except in compliance with the License.
//    You may obtain a copy of the License at
//
//        http://www.apache.org/licenses/LICENSE-2.0
//
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an "AS IS" BASIS,
//    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//    See the License for the specific language governing permissions and
//    limitations under the License.

var test = require('tap').test
  , obj_diff = require('../api')
  ;

var JS = JSON.stringify
  , JP = JSON.parse
  , JDUP = function(x) { return JSON.parse(JSON.stringify(x)) }
  ;


test('Defaults API', function(t) {
  var known =
  [ [{}, {}, {}]
  , [{a:1}, {a:1}, {}]
  , [{}, {foo:'bar'}, {foo: {from:undefined, to:'bar'}}]
  , [{foo:'bar'}, {}, {foo: {from:'bar', to:undefined}}],
  , [{a:1}, {a:"1"}, {a: {from:1, to:"1"}}]
  , [{a:1}, {b:1}, {a: {from:1, to:undefined}, b: {from:undefined, to:1}}]
  , [{}, {obj:{hi:true}}, {obj: {from:undefined, to:{hi:true}}}]
  , [{first:{second:{value:false}}}, {first:{second:{value:true}}}, {first:{second:{value:{from:false, to:true}}}}]
  ];

  known.forEach(function(row) {
    var from = row[0]
      , to   = row[1]
      , expected = row[2];

    var diff = obj_diff.diff(from, to);
    var message = "from="+JS(from) + " to="+JS(to);
    t.same(diff, expected, message);
  })

  t.end();
})
