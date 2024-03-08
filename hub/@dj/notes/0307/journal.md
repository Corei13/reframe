- move run inside the hook
- build with run
- make client component work
- refactor router
- make tailwind work
- make dynamic import work in prod
- deploy

- debt
  - import.meta.main is not supported (@seemanta)

### How would list work?

.list(**/*.ts)

local.list(**/*.ts) will just list all local files

npm.list(**/*.ts) will throw, because npm doesn't implement Listable

runnable(base).list() will return base.list()

r = router() .mount('/a', a) .mount('/b', b(r)) .mount('/c', c(r.at('/b')))
.mount('/e', e(f))

/b/b/a/something.ts

r.list(**/*.ts)

- a.list(**/*.ts)
- b.list(**/*.ts)

list(limit: number, after: number): { path: string,

}

"~@/@/**/.ts"

## Let's implement!

- @org/hook/run.ts
- @reframe/zero/build.ts
