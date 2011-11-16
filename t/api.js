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
  , doc_diff = require('../api').defaults({couchdb:true})

test('Standard API', function(t) { api_test(t, 'plain')   })
test('CouchDB API' , function(t) { api_test(t, 'couchdb') })

function api_test(t, style) {
  var diff_mod = (style == 'couchdb') ? doc_diff : obj_diff;
  var err, diff = diff_mod({}, {});

  ok('nochange 0 args', function() { diff.nochange()                      })
  ok('nochange 1 args', function() { diff.nochange('this')                })
  ok('nochange 2 args', function() { diff.nochange('this','is')           })
  ok('nochange 3 args', function() { diff.nochange('this','is','ignored') })

  nt('assert_nochange 0 args', function() { diff.assert_nochange()                })
  nt('assert_nochange 1 args', function() { diff.assert_nochange('x')             })
  nt('assert_nochange 2 args', function() { diff.assert_nochange('x','msg')       })
  nt('assert_nochange 3 args', function() { diff.assert_nochange('x','msg',23)    })
  nt('assert_nochange 4 args', function() { diff.assert_nochange('x','msg',23,42) })

  er = {name:'AssertionError', message:'Must provide key, old_val, new_val arguments'};

  ok('atleast 0 args'       , function() { diff.atleast()                    })
  no('atleast 1 args'       , function() { diff.atleast('x')                 })
  no('atleast 2 args'       , function() { diff.atleast('x','a')             })
  ok('atleast 3 args'       , function() { diff.atleast('x','a','b')         })
  no('atleast 4 args'       , function() { diff.atleast('x','a','b','y')     })
  no('atleast 5 args'       , function() { diff.atleast('x','a','b','y',1)   })
  ok('atleast 6 args'       , function() { diff.atleast('x','a','b','y',1,2) })

  ok('atmost 0 args'       , function() { diff.atmost()                    })
  no('atmost 1 args'       , function() { diff.atmost('x')                 })
  no('atmost 2 args'       , function() { diff.atmost('x','a')             })
  ok('atmost 3 args'       , function() { diff.atmost('x','a','b')         })
  no('atmost 4 args'       , function() { diff.atmost('x','a','b','y')     })
  no('atmost 5 args'       , function() { diff.atmost('x','a','b','y',1)   })
  ok('atmost 6 args'       , function() { diff.atmost('x','a','b','y',1,2) })

  er = {name:'AssertionError', message:'Must provide key, reason, old_val, new_val arguments'};

  ok('assert_atleast 0 args', function() { diff.assert_atleast()                              })
  no('assert_atleast 1 args', function() { diff.assert_atleast('x')                           })
  no('assert_atleast 2 args', function() { diff.assert_atleast('x','msg1')                    })
  no('assert_atleast 3 args', function() { diff.assert_atleast('x','msg1',1)                  })
  ok('assert_atleast 4 args', function() { diff.assert_atleast('x','msg1',1,2)                })
  no('assert_atleast 5 args', function() { diff.assert_atleast('x','msg1',1,2,'y')            })
  no('assert_atleast 6 args', function() { diff.assert_atleast('x','msg1',1,2,'y','msg2')     })
  no('assert_atleast 7 args', function() { diff.assert_atleast('x','msg1',1,2,'y','msg2',3)   })
  ok('assert_atleast 8 args', function() { diff.assert_atleast('x','msg1',1,2,'y','msg2',3,4) })

  ok('assert_atmost 0 args', function() { diff.assert_atmost()                              })
  no('assert_atmost 1 args', function() { diff.assert_atmost('x')                           })
  no('assert_atmost 2 args', function() { diff.assert_atmost('x','msg1')                    })
  no('assert_atmost 3 args', function() { diff.assert_atmost('x','msg1',1)                  })
  ok('assert_atmost 4 args', function() { diff.assert_atmost('x','msg1',1,2)                })
  no('assert_atmost 5 args', function() { diff.assert_atmost('x','msg1',1,2,'y')            })
  no('assert_atmost 6 args', function() { diff.assert_atmost('x','msg1',1,2,'y','msg2')     })
  no('assert_atmost 7 args', function() { diff.assert_atmost('x','msg1',1,2,'y','msg2',3)   })
  ok('assert_atmost 8 args', function() { diff.assert_atmost('x','msg1',1,2,'y','msg2',3,4) })

  t.end()

  function no(message, func) { t.throws(func, er, style + ' ' + message)   }
  function nt(message, func) { t.doesNotThrow(func, style + ' ' + message) }
  function ok(message, func) {
    t.doesNotThrow(function() {
      try { func() }
      catch (hissy) {
        // Match failures are fine. Only look for errors resulting from bad calls.
        if(style == 'plain' && hissy.name === 'Error' && hissy.diff)
          return;
        if(style == 'couchdb' && typeof hissy.forbidden === 'string')
          return;
        throw hissy;
      }
    }, style + ' ' + message)
  }
}
