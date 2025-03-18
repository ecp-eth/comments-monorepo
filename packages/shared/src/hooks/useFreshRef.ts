import { useRef } from "react";

export function useFreshRef<TValue>(value: TValue): React.RefObject<TValue> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
