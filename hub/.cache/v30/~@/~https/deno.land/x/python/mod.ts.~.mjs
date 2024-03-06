export default async (reframe_cxn93lksw0l) => {
    import.meta.path = "/~https/deno.land/x/python/mod.ts";
    const imports_pluh1xvwsm = await reframe_cxn93lksw0l.importMany("./src/python.ts");
    let exports_a49czctmjvs = {};
    exports_a49czctmjvs[Symbol.toStringTag] = "Module";
    const {} = imports_pluh1xvwsm["./src/python.ts"];
    exports_a49czctmjvs = {
        ...imports_pluh1xvwsm["./src/python.ts"],
        ...exports_a49czctmjvs
    };
    for (const [name, property] of [["default", "python"]]) {
        exports_a49czctmjvs[name] = imports_pluh1xvwsm["./src/python.ts"][property];
    }
    return exports_a49czctmjvs;
};
