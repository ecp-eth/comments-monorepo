export type CJSESMExport = {
  types: string;
  default: string;
  import?: string;
  ["react-native"]?: string;
};

export type Exports = Record<string, CJSESMExport | string>;

export type Package = Record<string, unknown> & {
  name?: string;
  private?: boolean;
  exports?: Exports;
};

export type NonPrivatePackageWithExports = Omit<
  Package,
  "private" | "exports"
> & {
  private?: false;
  exports: Exports;
};
