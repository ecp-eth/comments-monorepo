import { nativeWrap } from "./native-wrap";

export function log(...messages: unknown[]) {
  nativeWrap.log(
    messages
      .map((message) =>
        typeof message === "string" ? message : JSON.stringify(message),
      )
      .join(" "),
  );
}
