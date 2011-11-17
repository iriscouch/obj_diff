var fs = require('fs')
  , path = require('path')
  , couchapp = require('couchapp')
  ;


function read(path) { return fs.readFileSync(__dirname + '/../' + path, 'utf8') }


var ddoc = module.exports = { _id:'_design/obj_diff' };

ddoc.path = read('CouchDB/path.js');
ddoc.util = read('CouchDB/util.js');
ddoc.assert = read('CouchDB/assert.js');
ddoc.console = read('CouchDB/console.js');
ddoc.defaultable = read('node_modules/defaultable/defaultable.js');

ddoc.obj_diff = read('api.js');
ddoc.lib = { 'index': read('lib/index.js')
           , 'diffs': read('lib/diffs.js')
           , 'rules': read('lib/rules.js')
           }

ddoc.validate_doc_update = function(newDoc, oldDoc, userCtx, secObj) {
  require('console');

  var doc_diff = require('obj_diff').defaults({couchdb:true})
    , GONE = doc_diff.GONE
    , ANY  = doc_diff.ANY
    , GREATER = doc_diff.GREATER
    , TIMESTAMP = doc_diff.TIMESTAMP
    , diff = doc_diff(oldDoc, newDoc);

  if(newDoc._deleted)
    return;

  var min = [];
  if(!oldDoc)
    // Create
    min.push( 'created_at', 'must be a timestamp'  , GONE, TIMESTAMP
            , 'updated_at', 'must equal created_at', GONE, newDoc.created_at
            )
  else
    // Update
    min.push('updated_at', 'must increase', TIMESTAMP, GREATER);

  var max = min.concat(
    [ 'str'       , 'Must be a string', ANY, ['String']
    , 'num'       , 'Must be a number', ANY, ['Number']
    ])

  log('min:'); log(min);
  log('max:'); log(max);
  diff.assert_atleast.apply(diff, min);
  diff.assert_atmost.apply(diff, max);
}

ddoc.shows = {};
ddoc.shows.test = function(doc, req) {
  var ddoc = this;
  var I = JSON.stringify;

  //log(req.query);

  var response = {'headers': {}};

  provides('html', function() {
    require('console');
    var od = require('obj_diff')
      , D = od.defaults({couchdb:true})

    var result = D({}, {});
    response.body = '<html><body><pre><code>' + JSON.stringify(result) + '</code></pre></body></html>\n';
    //response.body = 'Defaultable: ' + require('defaultable');
    //response.body = result.join('\n') + '\n';
    return response;
  })
} // shows.test

if(require.main === module)
  console.log('ok');
