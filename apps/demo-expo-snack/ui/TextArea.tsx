import { TextInput, TextInputProps } from "react-native";

export default function TextArea(props: TextInputProps) {
  return (
    <TextInput
      {...props}
      style={{
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        minHeight: 80,
      }}
      multiline={true}
    />
  );
}
