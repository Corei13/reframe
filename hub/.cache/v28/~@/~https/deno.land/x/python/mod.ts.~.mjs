export default async (reframe_ujnbkuvkbur) => {
    import.meta.path = "/~https/deno.land/x/python/mod.ts";
    const imports_4kt64980tmx = await reframe_ujnbkuvkbur.importMany("./src/python.ts");
    let exports_48ey6570etr = {};
    exports_48ey6570etr[Symbol.toStringTag] = "Module";
    const {} = imports_4kt64980tmx["./src/python.ts"];
    exports_48ey6570etr = {
        ...imports_4kt64980tmx["./src/python.ts"],
        ...exports_48ey6570etr
    };
    for (const [name, property] of [["default", "python"]]) {
        exports_48ey6570etr[name] = imports_4kt64980tmx["./src/python.ts"][property];
    }
    return exports_48ey6570etr;
};
