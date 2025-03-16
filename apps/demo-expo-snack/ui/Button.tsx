import { Text, TouchableOpacity } from "react-native";

type ButtonProps = React.PropsWithChildren<{
  onPress?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}>;

export default function Button({ children, disabled, onPress }: ButtonProps) {
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      style={{
        backgroundColor: "#000",
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 20,
        marginHorizontal: "auto",
      }}
    >
      <Text
        style={{
          color: "#fff",
          textAlign: "center",
        }}
        disabled={disabled}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
}
