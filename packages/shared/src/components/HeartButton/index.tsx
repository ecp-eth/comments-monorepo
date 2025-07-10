import Lottie, { LottieRefCurrentProps } from "lottie-react";
import heartJSON from "./heart.json";
import { useCallback, useEffect, useRef, useState } from "react";

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

  // this state helps the useEffect to avoid triggering animation for setting the initial frame according to `isHearted` prop
  const [initialized, setInitialized] = useState(false);
  const [lastIsHearted, setLastIsHearted] = useState(isHearted);
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

      setInitialized(true);

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

    if (
      initialized &&
      // if it a change (we don't want to animate if it is already hearted)
      isHearted !== lastIsHearted &&
      // from not hearted to hearted
      isHearted
    ) {
      // then play the animation
      playHeartedAnimation();
    } else {
      // then play the animation
      gotoFrame(isHearted);
    }

    setInitialized(true);
    setLastIsHearted(isHearted);
  }, [
    animationLoaded,
    endFrame,
    gotoFrame,
    isHearted,
    lastIsHearted,
    playHeartedAnimation,
    pending,
    initialized,
  ]);

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
