import { PropsWithChildren } from "react";
import { KeyboardAvoidingView } from "react-native";

export default function Container({ children }: PropsWithChildren) {
  return (
    <KeyboardAvoidingView
      style={{
        padding: 30,
        gap: 20,
        // backgroundColor: "white",
        // boxShadow: "0px 1px 1px 2px rgba(0, 0, 0, 0.1)",
      }}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
