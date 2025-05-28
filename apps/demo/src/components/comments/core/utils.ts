export function getMediaOrientation(
  width: number,
  height: number,
): "landscape" | "portrait" | "square" {
  return width > height ? "landscape" : width < height ? "portrait" : "square";
}
