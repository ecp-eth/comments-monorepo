export default function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          jsxImportSource: "nativewind",
          unstable_transformImportMeta: true,
        },
      ],
      "nativewind/babel",
    ],
    plugins: [
      [
        "@babel/plugin-transform-modules-commonjs",
        // { loose: true, strict: false },
      ],
    ],
  };
}
