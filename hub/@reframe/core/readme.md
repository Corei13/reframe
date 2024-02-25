In this step, we pass @gates/three, which contains imports from npm. For this,
we create a new fs, npmFs, which resolves npm packages from esm.sh.

Additionally, we update the Runtime.resolve function to be able to resolve
import paths.

An absolute path can have the following forms:

- /path/to/file
- loader:/path/to/file
- loader1:loader2:/path/to/file
- /~loader/path/to/file (equivalent to loader:/path/to/file)
- /~loader1/~loader2/path/to/file (equivalent to loader1:loader2:/path/to/file)

Path resolution works on resolving the loader part and the file part separately.
Some examples:

```js
resolve("@/x/y/z/a.ts", "./b.ts"); // "@/x/y/z/b.ts"

resolve("@/x/y/z/a.ts", "@reframe/core"); // "@reframe/core"

resolve("@/x/y/z/a.ts", "@/x/y/z/d.ts"); // "@/x/y/z/d.ts"

resolve("transpile:@/x/y/z/a.ts", "./b.ts"); // "transpile:@/x/y/z/b.ts"

resolve("transpile:@/x/y/z/a.ts", "@reframe/core"); // "transpile:@reframe/core"

resolve("transpile:@/x/y/z/a.ts", "@/x/y/z/d.ts"); // "transpile:@/x/y/z/d.ts"

resolve("@/x/y/z/a.ts", "npm:react"); // "npm:react"

resolve("npm:react", "/v135/react/index.js"); // "npm:v135/react/index.js"
resolve("transpile:npm:react", "/v135/react/index.js"); // "transpile:npm:v135/react/index.js",

resolve("transpile:@/x/y/z/a.ts", "/:./b.ts"); // "@/x/y/z/b.ts",

resolve("transpile:npm:react", "/:transpile:/@reframe/core"); // "transpile:@reframe/core",

resolve("transpile:npm:react", "/:/@reframe/core"); // "@reframe/core",

resolve("transpile:npm:react", "..:/@reframe/core"); // "transpile:@reframe/core",
```
