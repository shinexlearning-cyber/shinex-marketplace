# Frontend response contract

The user frontend's request helper unwraps the JSON `data` property and returns it directly. Therefore collection endpoints consumed as arrays must place the array in `data`.

Example:

    { "success": true, "data": [ ... ], "pagination": { ... } }

The admin frontend does the same. Pagination is exposed at the top level for future use, while the current frontend receives the array from `data`.

Object endpoints use `data` for the object. Authentication returns `{ user, token }` inside `data`.
