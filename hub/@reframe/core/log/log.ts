export type LogFn = (...args: unknown[]) => void;

export type Logger = LogFn & {
  error: LogFn;
  warn: LogFn;
  debug: LogFn;
};

export const createLogger = (wrapper: (logger: LogFn) => LogFn): Logger =>
  Object.assign(
    wrapper(console.log),
    {
      error: wrapper(console.error),
      warn: wrapper(console.warn),
      debug: wrapper(console.debug),
    },
  );
