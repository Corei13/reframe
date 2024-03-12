## Data

Let's think databases.

Imagine we have a hook, @reframe/db. You go there, [[create a new database]].

Now you want to see the schema, which is empty. You want to make some changes,
so you create a new branch, and start adding tables and columns.

What is the source of truth? The database, or the code? It's the database,
translated into code.

Now, you want to apply the changes to the database - wait, before this, let's
write down all the operations we can do on the database.

- create a table
- create a column
- change type of a column
- change name of a column
- delete a column

### How would merge work?

Let's say we have two branches, A and B - created from A. The first step is to
get schema from A and B, then do the diff. Say the diff looks like this:

```ts
type Column = {
  type: string;
  default: string;
  notNull: boolean;
};

type Table = {
  name: string;
  columns: Record<string, Column>;
  relations: Array<Relation>;
  indexes: Array<Index>;
};

type Index = {
  name: string;
  columns: Array<string>;
  unique: boolean;
};

type Relation = {
  name: string;
  table: string;
  columns: Array<string>;
  onDelete: "cascade" | "restrict" | "set null" | "set default";
  onUpdate: "cascade" | "restrict" | "set null" | "set default";
};

type Schema = {
  tables: Array<Table>;
};

type Diff = Array<{
  table: string;
  changes: Array<
    {
      type: "create";
      column: string;
    } | {
      type: "delete";
      column: string;
    } | {
      type: "change";
      column: string;
      changes: Array<
        {
          type: "type";
          value: string;
        } | {
          type: "name";
          value: string;
        } | {
          type: "default";
          value: string;
        } | {
          type: "notNull";
          value: boolean;
        }
      >;
    }
  >;
}>;
```

### The first database

The first database we create will be to contain the hooks and blobs. This will
look something like

```ts
const Blob = {
  columns: {
    hash: { type: "text" },
    content: { type: "text" },
    size: { type: "int" },
    createdAt: { type: "timestamp" },
  },
  indices: [
    { columns: ["hash"], primary: true, unique: true },
  ],
};

const File = {
  path: { type: "text" },
  hash: { type: "text" },
  headers: { type: "json" },
  createdAt: { type: "timestamp" },
  updatedAt: { type: "timestamp" },
};

const Commit = {
  hash: { type: "text" },

  hook: { type: "text" },
  org: { type: "text" },
  hub: { type: "text" },

  message: { type: "text" },
  createdAt: { type: "timestamp" },

  relations: [
    { table: Hook, from: ["hook", "org", "hub"], to: ["name", "org", "hub"] },
  ],
};

// hub:@org/hook:commit
const Hook = {
  hub: { type: "text" },
  org: { type: "text" },
  name: { type: "text" },

  createdAt: { type: "timestamp" },
  updatedAt: { type: "timestamp" },
};

const Org = {
  name: { type: "text" },
  createdAt: { type: "timestamp" },
  updatedAt: { type: "timestamp" },
};

const Hub = {
  name: { type: "text" },
  createdAt: { type: "timestamp" },
  updatedAt: { type: "timestamp" },
};

const Database = {
  name: { type: "text" },
  createdAt: { type: "timestamp" },
  updatedAt: { type: "timestamp" },
};

const Deployment = {
  commit: { type: "text" },
  database: { type: "text" },

  createdAt: { type: "timestamp" },

  relations: [
    { table: Commit, from: ["commit"], to: ["hash"] },
  ],
};
```
