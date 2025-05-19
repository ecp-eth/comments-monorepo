import React from "react";
import { Pressable, View } from "react-native";
import SimpleLineIcons from "@expo/vector-icons/SimpleLineIcons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SideBar } from "./SideBar";
import { PropsWithChildren, useMemo } from "react";
import { Header } from "./Header";
import { vw } from "../lib/dimensions";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

const SIDE_BAR_PERCENTAGE = 40;
const SIDE_BAR_ANIMATION_DURATION = 100;

export function SideBarLayout({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const sideBarWidth = useMemo(() => vw(SIDE_BAR_PERCENTAGE), []);
  const { animatedStyle, toggleSideBar, gesture } =
    useSideBarAnimatedStyle(sideBarWidth);

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          {
            flex: 1,
            flexDirection: "row",
            width: vw(SIDE_BAR_PERCENTAGE + 100),
          },
          animatedStyle,
        ]}
      >
        <View
          style={{
            width: sideBarWidth,
          }}
        >
          <SideBar />
        </View>
        <View
          style={{
            flex: 1,
            width: vw(100),
            backgroundColor: "white",
          }}
        >
          <BurgerFloater onPress={toggleSideBar} />
          <View
            style={{
              flexGrow: 1,
              flexShrink: 0,
              flexDirection: "column",
              alignItems: "stretch",
              justifyContent: "flex-start",

              paddingTop: insets.top,
              paddingLeft: insets.left,
              paddingRight: insets.right,
            }}
          >
            <Header />
            <View
              style={{
                flex: 1,
                width: "100%",
                maxHeight: "100%",
              }}
            >
              {children}
            </View>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

function Burger() {
  return (
    <View
      style={{
        padding: 16,
      }}
    >
      <SimpleLineIcons name="menu" size={24} color="black" />
    </View>
  );
}

function BurgerFloater({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={onPress}
      style={{
        position: "absolute",
        top: insets.top,
        left: 0,
        zIndex: 1,
      }}
    >
      <Burger />
    </Pressable>
  );
}

function useSideBarAnimatedStyle(sideBarWidth: number) {
  const translateX = useSharedValue(-1 * sideBarWidth);
  // for manual activation detection
  const initialTouchLocation = useSharedValue<{ x: number; y: number } | null>(
    null,
  );
  // for dragging
  const initialX = useSharedValue(0);

  const gesture = Gesture.Pan()
    .manualActivation(true)
    .onTouchesDown((event) => {
      initialTouchLocation.value = {
        x: event.changedTouches[0].x,
        y: event.changedTouches[0].y,
      };
    })
    .onTouchesMove((event, state) => {
      if (!initialTouchLocation.value) {
        return;
      }

      const deltaX = Math.abs(
        event.changedTouches[0].x - initialTouchLocation.value.x,
      );

      if (deltaX > 20) {
        state.activate();
      }
    })
    .onTouchesUp(() => {
      initialTouchLocation.value = null;
    })
    .onStart(() => {
      initialX.value = translateX.value;
    })
    .onUpdate((event) => {
      const newValue = initialX.value + event.translationX;

      // Constrain movement between -SIDE_BAR_PERCENTAGE and 0
      const clampedValue = Math.max(-1 * sideBarWidth, Math.min(0, newValue));

      translateX.value = clampedValue;
    })
    .onEnd((event) => {
      const direction = event.velocityX < 0 ? -1 : 1;

      const leftMost = -1 * sideBarWidth;
      const rightMost = 0;

      const halfway = leftMost / 2;

      const to = direction === 1 ? rightMost : leftMost;
      const from = direction === 1 ? leftMost : rightMost;

      const passedHalfway =
        direction === 1
          ? translateX.value > halfway
          : translateX.value < halfway;
      // If velocity is high enough or dragged more than halfway, finish the animation in the same direction of velocity
      const shouldFinish = passedHalfway || Math.abs(event.velocityX) > 500;

      translateX.value = withTiming(shouldFinish ? to : from, {
        duration: SIDE_BAR_ANIMATION_DURATION,
      });
    });

  const toggleSideBar = () => {
    translateX.value = withTiming(
      translateX.value === 0 ? -1 * sideBarWidth : 0,
      { duration: SIDE_BAR_ANIMATION_DURATION },
    );
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return { animatedStyle, toggleSideBar, gesture };
}
