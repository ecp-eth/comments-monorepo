import * as React from "react";

import Svg, { SvgProps, G, Path, Defs, ClipPath } from "react-native-svg";

export function Ethereum(props: SvgProps) {
  return (
    <Svg viewBox="0 0 49 48" fill="none" {...props}>
      <G clipPath="url(#a)">
        <Path
          d="M24 48c13.255 0 24-10.745 24-24S37.255 0 24 0 0 10.745 0 24s10.745 24 24 24Z"
          fill="#627EEA"
        />
        <Path
          d="M23.854 6.4v13.076l11.051 4.938L23.853 6.4Z"
          fill="#fff"
          fillOpacity={0.602}
        />
        <Path d="M23.853 6.4 12.8 24.414l11.053-4.938V6.4Z" fill="#fff" />
        <Path
          d="M23.854 32.887v8.885l11.059-15.3-11.06 6.415Z"
          fill="#fff"
          fillOpacity={0.602}
        />
        <Path d="M23.853 41.772v-8.886L12.8 26.472l11.053 15.3Z" fill="#fff" />
        <Path
          d="m23.854 30.83 11.051-6.416-11.052-4.936v11.353Z"
          fill="#fff"
          fillOpacity={0.2}
        />
        <Path
          d="m12.8 24.414 11.053 6.417V19.479L12.8 24.413Z"
          fill="#fff"
          fillOpacity={0.602}
        />
      </G>
      <Defs>
        <ClipPath id="a">
          <Path fill="#fff" d="M0 0h48v48H0z" />
        </ClipPath>
      </Defs>
    </Svg>
  );
}
