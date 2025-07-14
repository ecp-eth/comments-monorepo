import LottieRaw, { LottieRefCurrentProps } from "lottie-react";
import heartJSON from "./heart.json";
import { useCallback, useEffect, useRef, useState } from "react";

// when peer dep `lottie-react` is transpiled by next js, and then got imported/required by module transpiled using tsup,
// the client side default export somehow got wrapped into an object `{ __esModule: true, default, ... }`,
// while the default export was correctly imported on server side SSR.
//
// This is a workaround to ensure the default export is correctly imported on client side.
const Lottie: typeof LottieRaw =
  "default" in LottieRaw ? (LottieRaw.default as typeof LottieRaw) : LottieRaw;

const lottieSize = 64;
const END_FRAME = 60;

type HeartButtonProps = {
  isHearted: boolean;
  pending?: boolean;
};

/**
 * React component with a heart button that animates when the user clicks on it.
 * This component uses `lottie-react` (peer dependency) to render the animation.
 *
 * It does not work on React Native.
 * @param param0
 * @returns
 */
export function HeartButton({ isHearted, pending = false }: HeartButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animatingState = useRef<{
    direction: "hearted" | "unhearted";
    animating: boolean;
  }>({
    direction: isHearted ? "hearted" : "unhearted",
    animating: false,
  });

  const [endFrame, setEndFrame] = useState(END_FRAME);
  const [animationLoaded, setAnimationLoaded] = useState(false);
  // using method on ref allows us to avoid unnecessary triggering of useEffect
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  const playHeartedAnimation = useCallback(() => {
    if (animatingState.current.direction === "hearted") {
      return;
    }

    containerRef.current?.classList.add("overflow-visible");
    animatingState.current.animating = true;
    animatingState.current.direction = "hearted";

    lottieRef.current?.goToAndPlay(0, true);
  }, []);

  const gotoFrame = useCallback(
    (hearted: boolean) => {
      if (
        animatingState.current.animating &&
        ((animatingState.current.direction === "hearted" && hearted) ||
          (animatingState.current.direction === "unhearted" && !hearted))
      ) {
        // no need to go to frame if it is already animating to hearted frame
        return;
      }

      containerRef.current?.classList.remove("overflow-visible");
      animatingState.current.animating = false;
      animatingState.current.direction = hearted ? "hearted" : "unhearted";

      lottieRef.current?.goToAndStop(hearted ? endFrame - 1 : 0, true);
    },
    [endFrame],
  );

  // Handle animation when the hearted state changes
  useEffect(() => {
    if (!animationLoaded || pending) {
      return;
    }

    gotoFrame(isHearted);
  }, [animationLoaded, endFrame, gotoFrame, isHearted, pending]);

  // Handle pending state
  useEffect(() => {
    if (!animationLoaded || !pending || isHearted) {
      return;
    }

    // If pending and not hearted, play the hearted animation
    playHeartedAnimation();
  }, [animationLoaded, pending, isHearted, playHeartedAnimation, gotoFrame]);

  useEffect(() => {
    if (animationLoaded) {
      setEndFrame(lottieRef.current?.getDuration(true) || END_FRAME);
    }
  }, [animationLoaded]);

  return (
    <div
      ref={containerRef}
      className="w-[24px] h-[24px] overflow-hidden flex items-start justify-start relative"
      role="button"
      aria-label={"Like comment"}
      aria-pressed={isHearted}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={heartJSON}
        loop={false}
        autoplay={false}
        onComplete={() => {
          containerRef.current?.classList.remove("overflow-visible");
          animatingState.current.animating = false;
        }}
        onDOMLoaded={() => {
          setAnimationLoaded(true);
        }}
        style={{
          width: lottieSize,
          height: lottieSize,
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );
}
