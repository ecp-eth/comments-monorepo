import { formatDate, formatDateRelative } from "@ecp.eth/shared/helpers";
import { useState } from "react";
import { Text, TouchableOpacity } from "react-native";

export function TimeBox({ timestamp }: { timestamp: Date }) {
  const [relative, setRelative] = useState(true);

  return (
    <TouchableOpacity
      onPress={() => setRelative(!relative)}
      style={{ flexDirection: "row", alignItems: "center" }}
    >
      {relative ? (
        <Text>{formatDateRelative(timestamp, Date.now())}</Text>
      ) : (
        <Text>{formatDate(timestamp)}</Text>
      )}
    </TouchableOpacity>
  );
}
