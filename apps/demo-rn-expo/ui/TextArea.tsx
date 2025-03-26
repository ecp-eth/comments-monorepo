import { forwardRef, Ref } from "react";
import { TextInput, TextInputProps } from "react-native";
import theme from "../theme";

export default forwardRef(function TextArea(
  {
    error,
    style,
    editable,
    ...props
  }: TextInputProps & { error?: string | boolean },
  ref: Ref<TextInput>
) {
  return (
    <TextInput
      {...props}
      editable={editable}
      style={[
        {
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 5,
          minHeight: 80,
          borderColor: error
            ? theme.colors.border.error
            : theme.colors.border.default,
          color: editable
            ? theme.colors.text.default
            : theme.colors.text.nonEditable,
          backgroundColor: editable
            ? theme.colors.background.default
            : theme.colors.background.nonEditable,
        },
        style,
      ]}
      multiline={true}
      ref={ref}
    />
  );
});
