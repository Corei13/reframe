import * as Body from "../body.ts";
import {
  Listable,
  Readable,
  Transformable,
  Watchable,
  Writeable,
} from "../defs.ts";

type Ctx<
  Read extends Readable | {} = {},
  Write extends Writeable | {} = {},
  Transform extends Transformable | {} = {},
  List extends Listable | {} = {},
  Watch extends Watchable | {} = {},
> = {
  handlers:
    & Read
    & Write
    & Transform
    & List
    & Watch;

  text: typeof Body.text;
  json: typeof Body.json;
  response: typeof Body.response;

  read: (
    _: Readable["read"],
  ) => Ctx<Readable, Write, Transform, List, Watch>;
  write: (
    _: Writeable["write"],
  ) => Ctx<Read, Writeable, Transform, List, Watch>;
  list: (_: Listable["list"]) => Ctx<Read, Write, Transform, Listable, Watch>;
  transform: (
    _: Transformable["transform"],
  ) => Ctx<Read, Write, Transformable, List, Watch>;
  watch: (
    _: Watchable["watch"],
  ) => Ctx<Read, Write, Transform, List, Watchable>;
};

export const createFs = <C extends Ctx = Ctx>(
  factory: (ctx: Ctx) => C,
): C["handlers"] => {
  const helper = <
    Read extends Readable | {} = {},
    Write extends Writeable | {} = {},
    Transform extends Transformable | {} = {},
    List extends Listable | {} = {},
    Watch extends Watchable | {} = {},
  >(
    handlers: Read & Write & Transform & List & Watch,
  ): Ctx<Read, Write, Transform, List, Watch> => ({
    handlers,

    text: Body.text,
    json: Body.json,
    response: Body.response,

    read: (read) =>
      helper<{ read: typeof read }, Write, Transform, List, Watch>(
        { ...handlers, read },
      ),

    write: (write) =>
      helper<Read, { write: typeof write }, Transform, List, Watch>(
        { ...handlers, write },
      ),

    list: (list) =>
      helper<Read, Write, Transform, { list: typeof list }, Watch>(
        { ...handlers, list },
      ),

    transform: (transform) =>
      helper<Read, Write, { transform: typeof transform }, List, Watch>(
        { ...handlers, transform },
      ),

    watch: (watch) =>
      helper<Read, Write, Transform, List, { watch: typeof watch }>(
        { ...handlers, watch },
      ),
  });

  const { handlers: fs } = factory(helper({}));
  return fs;
};
