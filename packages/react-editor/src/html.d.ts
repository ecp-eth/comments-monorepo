declare module "*.html" {
  const content: string;
  export { content as default };
}

// allow export css content as a string
declare module "@ecp.eth/react-editor/editor.css.js" {
  export const css: string;
}
