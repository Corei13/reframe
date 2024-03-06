export default async (reframe_xcx7gpbuogj) => {
    import.meta.path = "/~https/deno.land/x/python/mod.ts";
    const imports_oxoyitpgjdd = await reframe_xcx7gpbuogj.importMany("./src/python.ts");
    let exports_nq5oqkr5iem = {};
    exports_nq5oqkr5iem[Symbol.toStringTag] = "Module";
    const {} = imports_oxoyitpgjdd["./src/python.ts"];
    exports_nq5oqkr5iem = {
        ...imports_oxoyitpgjdd["./src/python.ts"],
        ...exports_nq5oqkr5iem
    };
    for (const [name, property] of [["default", "python"]]) {
        exports_nq5oqkr5iem[name] = imports_oxoyitpgjdd["./src/python.ts"][property];
    }
    return exports_nq5oqkr5iem;
};
