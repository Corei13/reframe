export default async () => {
    import.meta.path = "/~https/deno.land/x/python/src/util.ts";
    ;
    let exports_60im5mqtq0t = {};
    exports_60im5mqtq0t[Symbol.toStringTag] = "Module";
    const encoder = new TextEncoder();
    exports_60im5mqtq0t["encoder"] = encoder;
    const decoder = new TextDecoder();
    exports_60im5mqtq0t["decoder"] = decoder;
    const libDlDef = {
        dlopen: {
            parameters: ["buffer", "i32"],
            result: "pointer",
        },
    };
    function postSetup(lib) {
        let libdl;
        if (Deno.build.os === "linux") {
            const libc = Deno.dlopen(`libc.so.6`, {
                gnu_get_libc_version: { parameters: [], result: "pointer" },
            });
            const ptrView = new Deno.UnsafePointerView(libc.symbols.gnu_get_libc_version());
            const glibcVersion = parseFloat(ptrView.getCString());
            libdl = Deno.dlopen(
            // starting with glibc 2.34, libdl is merged into libc
            glibcVersion >= 2.34 ? `libc.so.6` : `libdl.so.2`, libDlDef);
        }
        else if (Deno.build.os === "darwin") {
            libdl = Deno.dlopen(`libc.dylib`, libDlDef);
        }
        else {
            return;
        }
        libdl.symbols.dlopen(cstr(lib), 0x00001 | 0x00100);
    }
    exports_60im5mqtq0t["postSetup"] = postSetup;
    function cstr(str) {
        const buf = new Uint8Array(str.length + 1);
        encoder.encodeInto(str, buf);
        return buf;
    }
    exports_60im5mqtq0t["cstr"] = cstr;
    const SliceItemRegExp = /^\s*(-?\d+)?\s*:\s*(-?\d+)?\s*(:\s*(-?\d+)?\s*)?$/;
    exports_60im5mqtq0t["SliceItemRegExp"] = SliceItemRegExp;
    return exports_60im5mqtq0t;
};
