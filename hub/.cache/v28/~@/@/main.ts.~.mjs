export default async (reframe_5u61t9c4pxl) => {
    import.meta.path = "/@/main.ts";
    const imports_uro3kqm9qd = await reframe_5u61t9c4pxl.importMany("/:./fibo.py");
    let exports_5i7z4155xph = {};
    exports_5i7z4155xph[Symbol.toStringTag] = "Module";
    const { default: fibo } = imports_uro3kqm9qd["/:./fibo.py"];
    console.log(fibo);
    console.log(fibo.fibo(15));
    return exports_5i7z4155xph;
};
