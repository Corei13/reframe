export const parse = (json: string) => JSON.parse(json);
export const stringify = (value: unknown) => JSON.stringify(value);

export default { parse, stringify };
