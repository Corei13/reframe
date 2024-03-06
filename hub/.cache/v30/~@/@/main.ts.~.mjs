export default async (reframe_uuwba4kzkm) => {
    import.meta.path = "/@/main.ts";
    const imports_2kp72n0g0pp = await reframe_uuwba4kzkm.importMany("/:./fibo.py");
    let exports_y7b32zruu2 = {};
    exports_y7b32zruu2[Symbol.toStringTag] = "Module";
    const { default: fibo } = imports_2kp72n0g0pp["/:./fibo.py"];
    console.log(fibo);
    console.log(fibo.fibo(15));
    return exports_y7b32zruu2;
};
