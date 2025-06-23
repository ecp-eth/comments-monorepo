import Lottie, { LottieRefCurrentProps } from "lottie-react";
import heartJSON from "./heart.json";
import { useCallback, useEffect, useRef, useState } from "react";

const lottieSize = 64;
const END_FRAME = 60;

type HeartAnimationProps = {
  isHearted: boolean;
  onIsHeartedChange?: (isHearted: boolean) => void;
  pending?: boolean;
};

export function HeartAnimation({
  isHearted,
  onIsHeartedChange,
  pending = false,
}: HeartAnimationProps) {
  const animatingState = useRef<{
    direction: "hearted" | "unhearted";
    animating: boolean;
  }>({
    // reverse the initial direction so the useEffect -> gotoFrame works
    direction: isHearted ? "unhearted" : "hearted",
    animating: false,
  });

  const [lastIsHearted, setLastIsHearted] = useState(isHearted);
  const [endFrame, setEndFrame] = useState(END_FRAME);
  const [animationLoaded, setAnimationLoaded] = useState(false);
  // using method on ref allows us to avoid unnecessary triggering of useEffect
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  const playHeartedAnimation = useCallback(() => {
    if (animatingState.current.direction === "hearted") {
      return;
    }

    animatingState.current.animating = true;
    animatingState.current.direction = "hearted";

    lottieRef.current?.goToAndPlay(0, true);
  }, []);

  const gotoFrame = useCallback(
    (hearted: boolean) => {
      if (
        (animatingState.current.direction === "hearted" && hearted) ||
        (animatingState.current.direction === "unhearted" && !hearted)
      ) {
        // no need to go to frame if it is already animating to hearted frame
        return;
      }

      animatingState.current.animating = false;
      animatingState.current.direction = hearted ? "hearted" : "unhearted";

      lottieRef.current?.goToAndStop(hearted ? endFrame - 1 : 0, true);
    },
    [endFrame],
  );

  const handleClick = () => {
    const newValue = !isHearted;
    onIsHeartedChange?.(newValue);
  };

  // Handle animation when the hearted state changes
  useEffect(() => {
    if (!animationLoaded || pending) {
      return;
    }

    if (
      // if it a change (we don't want to animate if it is already hearted)
      isHearted !== lastIsHearted &&
      // from not hearted to hearted
      isHearted
    ) {
      // then play the animation
      playHeartedAnimation();
    } else {
      gotoFrame(isHearted);
    }

    setLastIsHearted(isHearted);
  }, [
    animationLoaded,
    endFrame,
    gotoFrame,
    isHearted,
    lastIsHearted,
    playHeartedAnimation,
    pending,
  ]);

  // Handle pending state
  useEffect(() => {
    if (!animationLoaded || !pending || isHearted) {
      return;
    }

    // If pending and hearted, keep repeating the animation
    playHeartedAnimation();

    // do we want to repeat the animation?
    // const interval = setInterval(() => {
    //   lottieRef.current?.goToAndPlay(1, true);
    // }, 300);
    // return () => clearInterval(interval);
  }, [animationLoaded, pending, isHearted, playHeartedAnimation, gotoFrame]);

  useEffect(() => {
    if (animationLoaded) {
      setEndFrame(lottieRef.current?.getDuration(true) || END_FRAME);
    }
  }, [animationLoaded]);

  return (
    <div
      className="w-[24px] h-[24px] overflow-visible flex items-start justify-start relative"
      role="button"
      aria-label={"Like comment"}
      aria-pressed={isHearted}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      onClick={handleClick}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={heartJSON}
        loop={false}
        autoplay={false}
        onComplete={() => {
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
