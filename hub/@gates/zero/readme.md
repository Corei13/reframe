```sh
$ cd hub
$ ./@reframe/core/main.ts dev serve @gates/zero/main.js
```

As the first step, we create two hooks with following structure:

- @reframe/core
  - server.ts -- a server that can serve an entry
  - main.ts -- a cli that accepts a path in the format
    @org/name/path/to/entry.ts and can run the server

- @gates/zero
  - main.js, a js file that exports a server and does not have any imports
