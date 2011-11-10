# Identify and assert differences betwen objects

obj_diff is for clearly and reliably seeing and asserting differences between Javascript and JSON objects. Use it to **see how data has changed** and to **decide whether that change is good or bad**. Thus obj_diff is useful for security and validation.

obj_diff comes from an internal [Iris Couch][ic] application used in production for two years. It works in the browser, in CouchDB, and as an NPM module.

    npm install obj_diff

## Is it any good?

Yes.

## Usage

Just diff two objects, then use helper functions to see what's changed.

```javascript
var obj_diff = require("obj_diff");

var original = { hello:"world"     , note: {"nice":"shoes"} };
var modified = { hello:"underworld", note: {"nice":"hat"  } };

var diff = obj_diff(original, modified);

// Mandatory changes
if(diff.atleast("hello", "world", "underworld")) // Passes
  console.log("That's kind of dark, isn't it");
else
  console.log("At least you aren't obsessed with the underworld");

// Approved changes
if(diff.atmost("hello.note.nice", "shoes", "hat")) // Fails (due to .hello change)
  console.log("Thanks! It's a nice hat, isn't it?");
else
  console.log("You talk too much");
```

## Design

To work well with databases, obj_diff has these design goals:

* **Declarative**. Data validation is crucial. It must be correct. Validation rules must be easy to express clearly and easy to reason about.
* **JSON compatible**. Diffs and validation rules (containing regexes, functions, etc.) can be encoded and decoded as JSON, without losing functionality. You can store changes and validation policies as plain JSON.

### Mandatory changes: atleast()

atleast() returns `true` if **every rule matches** a change, and `false` otherwise.

```javascript
// Give a key name, an expected old value, and expected new value.
diff.atleast("some_key", "old_value", "new_value");

// Nested objects: just type them out in the string.
diff.atleast("options.production.log.level", "debug", "info");

// Regular expressions, e.g. first letter must change from "J" to "S".
diff.atleast("name", /^J/, /^S/);

// ANY matches any value.
diff.atleast("state", obj_diff.ANY, "run"); // State must become "run".
diff.atleast("owner", null, obj_diff.ANY);  // Owner must become non-null.

// GONE implies a missing value.
diff.atleast("error", "locked", obj_diff.GONE); // Error must be deleted.
diff.atleast("child", obj_diff.GONE, "Bob");    // Child must be created.

// FALSY matches false, null, undefined, the empty string, 0, and NaN.
diff.atleast("is_new", obj_diff.ANY, obj_diff.FALSY);

// "TRUTHY" matches anything not falsy.
diff.atleast("changed", obj_diff.GONE, obj_diff.TRUTHY);

// Javascript types
diff.atleast("ratio"  , undefined    , Number ); // Numeric ratio, note undefined is not GONE
diff.atleast("age"    , obj_diff.ANY , Number ); // Age must change to something numeric.
diff.atleast("name"   , obj_diff.GONE, String ); // Must create a name string.
diff.atleast("deleted", obj_diff.ANY , Boolean); // Deleted flag must be true/false.
diff.atleast("config" , obj_diff.GONE, Object ); // Must create a config object.
diff.atleast("backups", null         , Array  ); // Null backups must become an array.

// TIMESTAMP matches ISO-8601 strings, i.e. what JSON.stringify(new Date) makes.
diff.atleast("created_at", GONE, TIMESTAMP); // e.g. "2011-11-10T04:21:45.046Z"

// GREATER and LESSER compare a value to its counterpart.
diff.atleast("age", Number, GREATER); // Age must increase in number
diff.atleast("age", LESSER, Number);  // (same as the previous test)

diff.atleast("weight"   , GREATER, LESSER ); // Mandatory weight loss
diff.atleast("happiness", LESSER , GREATER); // Mandatory improved mood

diff.atleast("WRONG", GREATER, GREATER); // This always fails.
diff.atleast("WRONG", LESSER , LESSER ); // This always fails.

// Use functions (predicates) for arbitrary data validation
function good_weapon(weapon) {
  return weapon != process.env.bad_weapon;
}

diff.atleast("weapon", obj_diff.ANY, good_weapon);

// Specify multiple rules simultaneously.
diff.atleast(
  "some_key"                    , "old_value" , "new_value"
  "options.production.log.level", "debug"     , "info"
  "name"                        , obj_diff.ANY, /^S/
  "weapon"                      , obj_diff.ANY, good_weapon
);

// Or as an assertion
try {
  diff.assert.atleast(
    "some_key"                    , "old_value" , "new_value"
    "options.production.log.level", "debug"     , "info"
    "name"                        , obj_diff.ANY, /^S/
    "weapon"                      , obj_diff.ANY, good_weapon
  );
} catch (er) {
  console.error("Change required: " + er);
}
```

### Allowed changes: atmost()

atmost() returns `true` if **every change matches** a rule, and `false` otherwise.

```javascript
// Often, you specify multiple rules in a list.
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

// Or as an assertion.
try {
  diff.assert.atmost(
    "weapon"     , obj_diff.ANY, good_weapon,
    "name.first" , obj_diff.ANY, /^\w+$/,
    "name.last"  , "Smith"     , /^\w+$/,
    "name.middle", obj_diff.ANY, /^\w$/
  );
} catch (er) {
  console.error("Sorry, disallowed change: " + er);
}
```

A useful trick with *atmost()* is to assert no changes.

```javascript
try {
  diff2.assert.atmost();   // No rules given, i.e. "zero changes, at most"
  diff2.assert.nochange(); // Same as atmost() but more readable.
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
2. The String `._rev` may change.
3. The Array `._revisions.ids` may change.
4. *assert.atleast()* and *assert.atmost()* throw `{"forbidden": <reason>}` objects that Couch likes.

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
  diff.assert.atleast(
    'created_at', 'timestamp required', GONE, TIMESTAMP,
    'updated_at', 'timestamp required', GONE, newDoc.created_at // Must match created_at
  );
else
  // Update, exact() will reject changes to .created_at (and all other fields)
  diff.assert.exactly(
    'updated_at', 'Must be a timestamp'  , TIMESTAMP, TIMESTAMP,
    'updated_at', 'Must be later in time', TIMESTAMP, GREATER
  );
```

### Example: User Documents



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
    ok rules.js ..................... 110/110
    total ........................... 111/111

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
