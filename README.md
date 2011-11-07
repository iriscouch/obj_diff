Basically given object A and B, it outputs a new object D (for "diff") with keys being those that differed between A and B. i.e. Object.keys(D) tells you all keys that changed between A and B
the values of those keys are themselves objects of the form {"from":val_from_A, "to":val_from_B}
There are also some assertions such as "at most" or "at least". So if you say these objects must have "at most" {} changes (i.e. an empty document), then you are asserting that they are identical.
If you say they must have "at least" a change of {"timestamp": {"from":"yesterday", "to":"today"}} then you are requiring that the .timestamp value *must* change accordingly. ("from" and "to" can be regular expressions, or function predicates).
Usually for validate_doc_update, I have my minimum changes required, and my maximum changes required to define (declaratively!) exactly that must change, what may change, and what may not change

