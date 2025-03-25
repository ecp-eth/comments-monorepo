export type Package = Record<string, unknown> & {
  name?: string;
  private?: boolean;
  exports?: Record<string, { types: string; default: string } | string>;
};

export type NonPrivatePackageWithExports = Omit<
  Package,
  "private" | "exports"
> & {
  private?: false;
  exports: Record<string, { types: string; default: string } | string>;
};
