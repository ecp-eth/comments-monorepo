import { Dimensions, Platform } from "react-native";

// FIXME: handle rotation
export const vw = (percent: number) => {
  const width = Dimensions.get("window").width;
  return (width * percent) / 100;
};

export const vh = (percent: number) => {
  const height = Dimensions.get("window").height;
  return (height * percent) / 100;
};
