import { Button } from "./ui/button";

export function ScrollToCommentButton() {
  return (
    <Button
      type="button"
      onClick={() => {
        const iframe = document.querySelector("iframe[src]");
        iframe?.scrollIntoView({ behavior: "smooth" });
      }}
    >
      See it in action at the bottom of this page 👇
    </Button>
  );
}
