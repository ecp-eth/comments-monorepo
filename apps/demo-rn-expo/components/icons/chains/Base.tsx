import Svg, { Path, SvgProps } from "react-native-svg";

export function Base(props: SvgProps) {
  return (
    <Svg width="111" height="111" viewBox="0 0 111 111" fill="none" {...props}>
      <Path
        d="M54.921 110.034C85.359 110.034 110.034 85.402 110.034 55.017C110.034 24.6319 85.359 0 54.921 0C26.0432 0 2.35281 22.1714 0 50.3923H72.8467V59.6416H3.9565e-07C2.35281 87.8625 26.0432 110.034 54.921 110.034Z"
        fill="#0052FF"
      />
    </Svg>
  );
}
