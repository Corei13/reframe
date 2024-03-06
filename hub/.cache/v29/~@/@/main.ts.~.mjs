export default async (reframe_51gez8tri7p) => {
    import.meta.path = "/@/main.ts";
    const imports_aejbcfsz62f = await reframe_51gez8tri7p.importMany("/:./fibo.py");
    let exports_u98ox7zmmrj = {};
    exports_u98ox7zmmrj[Symbol.toStringTag] = "Module";
    const { default: fibo } = imports_aejbcfsz62f["/:./fibo.py"];
    console.log(fibo);
    console.log(fibo.fibo(15));
    return exports_u98ox7zmmrj;
};
