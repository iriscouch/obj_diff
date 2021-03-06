# Identify and assert differences betwen objects

obj_diff is for examining changes between Javascript and JSON objects. Use it to **see how data has changed** and to **decide whether that change is good or bad**. Thus obj_diff is useful for security and validation.

obj_diff comes from an internal [Iris Couch][ic] application used in production for two years. It works in the browser, in CouchDB, and as an NPM module.

    npm install obj_diff

## Is it any good?

Yes.

## Usage

Diff two objects. Then use helper functions to see what's changed.

```javascript
var obj_diff = require("obj_diff");

var original = { hello:"world"     , note: {"nice":"shoes"} };
var modified = { hello:"underworld", note: {"nice":"hat"  } };

var diff = obj_diff(original, modified);

// Mandatory changes
if(diff.atleast("hello", "world", "underworld"))    // true
  console.log("That's kind of dark");


// Approved changes
if(diff.atmost("hello", "world", "underworld"))     // false (.hello.note.nice also changed)
  console.log("That's kind of dark");


if(diff.atmost("hello"          , "world", /world/, // true
               "hello.note.nice", "shoes", String))
  console.log("Hooray!");
```

## Design

To work well with databases, obj_diff has these design goals:

* **Declarative**. Data validation is crucial. It must be correct. Validation rules must be easy to express clearly and easy to reason about.
* **JSON compatible**. Diffs and validation rules (containing regexes, functions, etc.) can be encoded and decoded as JSON, without losing functionality. You can store changes and validation policies as plain JSON.

## Mandatory vs. Approved changes

There is a symbiotic relationship between *atleast* and *atmost*:

* atleast() returns `true` only if **every rule matches a change**.
* atmost() returns `true` only if **every change matches a rule**.

```javascript
// Give a key name, an expected old value, and expected new value.
diff.atleast("some_key", "old_value", "new_value");

// Specify multiple rules simultaneously.
diff.atleast(

  // Nested objects: just type them out in the string.
  "options.production.log.level", "debug", "info",

  // Regular expressions, e.g. first letter must change from "J" to "S".
  "name", /^J/, /^S/,

  // ANY matches any value.
  "state", obj_diff.ANY, "run", // State must become "run".
  "owner", null, obj_diff.ANY,  // Owner must become non-null.

  // GONE implies a missing value.
  "error", "locked", obj_diff.GONE, // Error must be deleted.
  "child", obj_diff.GONE, "Bob",    // Child must be created.

  // FALSY matches false, null, undefined, the empty string, 0, NaN, and a missing value.
  "is_new", obj_diff.ANY, obj_diff.FALSY,

  // "TRUTHY" matches anything not falsy.
  "changed", obj_diff.GONE, obj_diff.TRUTHY,

  // Javascript types
  "ratio"  , undefined    , Number , // Numeric ratio, note undefined is not GONE
  "age"    , obj_diff.ANY , Number , // Age must change to something numeric.
  "name"   , obj_diff.GONE, String , // Must create a name string.
  "deleted", obj_diff.ANY , Boolean, // Deleted flag must be true/false.
  "config" , obj_diff.GONE, Object , // Must create a config object.
  "backups", null         , Array  , // Null backups must become an array.

  // TIMESTAMP matches ISO-8601 strings (what JSON.stringify makes from a Date)
  "created_at", GONE, TIMESTAMP, // e.g. "2011-11-10T04:21:45.046Z"

  // GREATER and LESSER compare a value to its counterpart.
  "age", Number, GREATER, // Age must increase in number
  "age", LESSER, Number,  // (same as the previous test)

  "weight", GREATER, LESSER , // Mandatory weight loss
  "age"   , 21 , GREATER,     // Must increase from 21

  "WRONG", GREATER, GREATER, // This always fails.
  "WRONG", LESSER , LESSER , // This always fails.

  // Use functions (predicates) for arbitrary data validation
  "weapon", obj_diff.ANY, good_weapon
);

diff.atmost(
  // Changing my weapon is fine.
  "weapon", obj_diff.ANY, good_weapon,

  // Changing my first name to something readable is fine.
  "name.first", obj_diff.ANY, /^\w+$/,

  // People named "Smith" may change their last name.
  "name.last", "Smith", /^\w+$/,

  // Middle must be just an initial.
  "name.middle", obj_diff.ANY, /^\w$/
);

// Or as an assertion, with an extra "reason" argument.
try {
  diff.assert_atleast(
    "some_key"         , "must become new new" , "old_value" , "new_value",
    "options.log.level", "must upgrade to info", "debug"     , "info",
    "name"             , "must start with 'S'" , obj_diff.ANY, /^S/,
    "weapon"           , "cannot be sharp"     , obj_diff.ANY, good_weapon
  );
} catch (er) {
  if(!er.diff)
    throw er; // Unknown error, not a policy failure, e.g. bad parameters, or a predicate error.

  console.error("Hey! " + er.message); // e.g. Hey! options.log.level must upgrade to info
}

try {
  diff.assert_atmost(
    "weapon"     , "cannot be sharp"       , obj_diff.ANY, good_weapon,
    "name.first" , "must be readable"      , obj_diff.ANY, /^\w+$/,
    "name.last"  , "may no longer be Smith", "Smith"     , /^\w+$/,
    "name.middle", "must be one letter"    , obj_diff.ANY, /^\w$/
  );
} catch (er) {
  if(!er.diff)
    throw er; // Unknown error

  // .reason, .key, .from, .to are available.
  console.error(er.key + " is wrong because it " + er.reason); // detailed
}

function good_weapon(weapon) {
  return weapon != process.env.sharp_weapon;
}
```

A useful trick with *atmost()* is to assert no changes.

```javascript
try {
  diff2.assert_atmost();   // No rules given, i.e. "zero changes, at most"
  diff2.assert_nochange(); // Same as atmost() but more readable.
} catch (er) {
  console.error("Sorry, no changes allowed");
}
```

<a name="couchdb"></a>
## CouchDB validation

obj_diff excels (and was designed for) [Apache CouchDB][couchdb] `validate_doc_update()` functions. Combine *atleast()* and *atmost()* to make a sieve and sift out good and bad changes. obj_diff cannot replace all validation code, but it augments it well.

* *atleast()* confirms **required** changes.
* *atmost()* confirms **allowed** changes.

First of all, CouchDB changes document metadata under the hood, and you don't want that triggering false alarms. So the first thing is to set obj_diff's [defaults][def] for CouchDB mode, which modifies *atmost()* to allow normal document changes:

1. `null` is treated as an empty object, `{}`. This always works: `doc_diff(oldDoc, newDoc)`
2. *atmost()* allows normal changes:
  * `_id` for document creation
  * `_rev` may change appropriately.
  * `_revisions.ids` and `_revisions.start` may change appropriately.
3. *assert_atleast()* and *assert_atmost()* throw `{"forbidden": <reason>}` objects that Couch likes.

Thus, this is your typical `validate_doc_update` function:

```javascript
function(newDoc, oldDoc, userCtx, secObj) {
  var doc_diff = require("obj_diff").defaults({"couchdb":true}) // Relaxed diff.
    , ANY      = doc_diff.ANY
    , GONE     = doc_diff.GONE
    ;

  var diff = doc_diff(oldDoc, newDoc);
  // Start validating!
}
```

### Valid data vs. valid changes

obj_diff validates *changes*, not *data*. What happens if you GET a document and PUT it back unmodified? There will be zero changes in the diff. Any *atleast()* checks will necessarily fail. Therefore, the best practice is to check the data and then apply certain policies based on that.

Of course, sometimes you *want* changes in every update, such as timestamp validation:

```javascript
if(!oldDoc)
  // Creation, require the timestamp fields.
  diff.assert_atleast(
    'created_at', 'timestamp required', GONE, TIMESTAMP,
    'updated_at', 'timestamp required', GONE, newDoc.created_at // Must match created_at
  );
else
  // Update, exact() will reject changes to .created_at (and all other fields)
  diff.assert_exactly(
    'updated_at', 'Must be a timestamp'  , TIMESTAMP, TIMESTAMP,
    'updated_at', 'Must be later in time', TIMESTAMP, GREATER
  );
```

### Example: User Documents

TODO

## JSON Support

obj_diff supports regular expressions and function callbacks in its rules. Yet it can be nice to store them as JSON, and to load them later. For example, you could store a few rules in a CouchDB `_security` object, and do database-specific data validation with an identical `validate_doc_update()` function.

Both Diff and Rule obejcts behave the same after a JSON round-trip. They have a `.toJSON` function to handle things, so just `JSON.stringify()` them and store them in a file or database. Later, `JSON.parse()` them and pass the object to the constructors.

```javascript
var obj_diff = require("obj_diff");

function good_guy(guy) { return guy.good || guy.awesome }

var diffs =
  [ obj_diff({some_key: "old_value"}, {some_key: "new_value"})
  , obj_diff({log: {level: "Anything!"}}, {log: {level: "info"}})
  , obj_diff({guy: {"good":true}}, {guy:"Fawkes"})
  ];

var rules =
  [ new obj_diff.Rule("some_key", "old_value", "new_value")
  , new obj_diff.Rule("log.level", obj_diff.ANY, /^(debug|info|error)$/)
  , new obj_diff.Rule("guy", good_guy, obj_diff.ANY)
  ];

console.log("Diffs: " + JSON.stringify(diffs));
console.log("Rules: " + JSON.stringify(rules));
```

Note, functions are stored using their source code, so be careful about global or closed variables they depend on.

## Development

obj_diff uses [node-tap][tap] unit tests. Install it globally (`npm -g install node-tap`) and run `tap t`. Or for a more robust local install:

    $ npm install --dev
    tap@0.0.10 ./node_modules/tap
    └── tap-runner@0.0.7

    $ ./node_modules/.bin/tap t
    ok api.js ......................... 82/82
    ok diffs.js ....................... 60/60
    ok policy.js .................... 123/123
    ok rules.js ..................... 774/774
    total ......................... 1043/1043

    ok

Finally, you can use the diff object yourself. Here's what it looks like:

    > obj_diff({x:"hi"}, {x:"bye"})
    { x: { from: 'hi', to: 'bye' } }

    > obj_diff({name:"Joe", word:"hi"},
    ...        {name:"Joe", word:"bye"})
    { word: { from: 'hi', to: 'bye' } }

    > obj_diff({name:"Joe", contact: {email:"doe@example.com"}},
    ...        {name:"Joe", contact: {email:"doe@example.com", cell:"555-1212"}})
    { contact: { cell: { from: ['gone'], to: '555-1212' } } }

    > obj_diff({name:"Joe", contact: {email:"doe@example.com", cell:null      }},
    ...        {name:"Joe", contact: {email:"doe@example.com", cell:"555-1212"}})
    { contact: { cell: { from: null, to: '555-1212' } } }

## License

obj_diff is licensed under the Apache License, version 2.0

[def]: https://github.com/iriscouch/defaultable
[ic]: http://www.iriscouch.com/
[couchdb]: http://couchdb.apache.org/
[tap]: https://github.com/isaacs/node-tap
