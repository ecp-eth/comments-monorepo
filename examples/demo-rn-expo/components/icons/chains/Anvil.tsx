import * as React from "react";
import Svg, { SvgProps, Path, Circle } from "react-native-svg";

export function Anvil(props: SvgProps) {
  return (
    <Svg fill="#FFF" viewBox="-6 -6 48 48" {...props}>
      <Circle cx="18" cy="17" r="22" fill="#0052FF" />
      <Path d="M26.375 14.833c1.548-0.494 3.096-1.594 4.644-3.19-1.549-1.624-3.063-2.424-4.644-2.725v-2.263h-18.874v1.643h-6.355c1.146 3.109 3.659 5.252 6.355 5.985v2.68h4.97c-0.863 2.931-2.652 5.337-4.839 7.419h-1.878v1.644c-0.008 0.007-0.016 0.013-0.024 0.020h0.024v2.223h23.505v-3.886h-2.499c-2.444-2.080-4.177-4.484-4.984-7.419h4.599v-2.131z" />
    </Svg>
  );
}
