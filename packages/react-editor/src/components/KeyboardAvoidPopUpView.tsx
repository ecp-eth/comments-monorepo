import React, { useEffect, memo, useState } from "react";
import { Dimensions, TouchableWithoutFeedback, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Portal } from "@gorhom/portal";
import { useKeyboardDimensions } from "../hooks/use-keyboard-dimensions";

const slideInEasing = Easing.bezier(0.25, 0.1, 0.25, 1);

interface Props {
  enabled: boolean;
  inputRect: DOMRect;
  gap: number;
  children: ({
    popAbove,
    maxHeight,
  }: {
    popAbove: boolean;
    maxHeight: number;
  }) => React.ReactNode;
  onDismiss: () => void;
}

// based on https://medium.com/@alexdemchenko/making-a-right-keyboard-accessory-view-in-react-native-8943682fc6a9
export const KeyboardAvoidPopUpView = memo(function KeyboardAccessoryView({
  enabled,
  children,
  inputRect,
  gap,
  onDismiss,
}: Props) {
  const safeArea = useSafeAreaInsets();
  const { keyboardHeight, keyboardTopY } = useKeyboardDimensions();
  const screenHeight = Dimensions.get("screen").height;

  // we can't trust the inputRect retrieved from noLayout directly.
  // cuz the input be can placed into a KeyboardStickyView, which presumably using translateY to push
  // the input up. translated location is not retrievable using onLayout or measureInWindow.
  // if the virtual keyboard is visible (not using physical keyboard), normally the input should be pushed up by the keyboard.
  // so if the input goes beyond the keyboard top border, we can infer that the input is translated.
  const isInputLocationTranslated =
    keyboardHeight > 0 && inputRect.bottom > screenHeight - keyboardHeight;

  // if the input is translated, figure out the translated Y positions
  const inputRectBottom = isInputLocationTranslated
    ? keyboardTopY - (screenHeight - inputRect.bottom)
    : inputRect.bottom;
  const inputRectTop = isInputLocationTranslated
    ? keyboardTopY - (screenHeight - inputRect.top)
    : inputRect.top;

  // if the topLimiter is above of mid of available space, we make the layer underneath the input
  // otherwise, we make the layer above the input
  const popAbove =
    inputRectBottom + gap > Math.abs((keyboardTopY - safeArea.top) / 2);
  const topLimit = popAbove ? 0 : inputRectBottom + gap;
  const bottomLimit = popAbove
    ? screenHeight - (inputRectTop - gap)
    : keyboardHeight;
  const translateY = useSharedValue(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  useEffect(() => {
    if (!enabled) {
      setIsAnimating(false);
      return;
    }

    setIsAnimating(true);
    translateY.value = keyboardTopY - safeArea.top;
    translateY.value = withTiming(
      0,
      {
        duration: 550,
        easing: slideInEasing,
      },
      () => {
        scheduleOnRN(setIsAnimating, false);
      },
    );
  }, [enabled, keyboardTopY, safeArea.top, translateY]);

  if (!enabled) {
    return null;
  }

  const maxHeight = popAbove
    ? screenHeight - bottomLimit - topLimit - safeArea.top
    : screenHeight -
      bottomLimit -
      topLimit -
      (keyboardHeight > 0 ? 0 : safeArea.bottom);

  return (
    <Portal>
      {/* View that capture any click on background */}
      <TouchableWithoutFeedback
        onPress={() => {
          onDismiss?.();
        }}
      >
        <View
          style={{
            position: "absolute",

            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
          }}
        >
          {/* View that crops the pop using overflow: hidden while animating */}
          <View
            style={{
              position: "absolute",

              top: topLimit,
              bottom: bottomLimit,
              left: 0,
              right: 0,

              overflow: isAnimating ? "hidden" : "visible",
            }}
          >
            {/* Animated view that contains the pop background (extends to max height/width regardless of the safe area) */}
            <Animated.View
              style={[
                {
                  position: "absolute",

                  left: 0,
                  right: 0,
                  bottom: 0,

                  ...(popAbove
                    ? {
                        // for poping above we style a little differently when the number of items is too little
                        // we don't want to cover the top area where there are no items.
                        // we also want to show a border on both ends
                        maxHeight,

                        boxShadow: "0 -5px 5px 0 rgba(0, 0, 0, 0.1)",
                      }
                    : {
                        top: 0,
                      }),
                  backgroundColor: "#FFF",
                },
                animatedStyle,
              ]}
            >
              {/* View that contains the pop content with in safe area */}
              <View
                style={[
                  {
                    flex: 1,

                    ...(popAbove
                      ? {
                          // marginTop: safeArea.top,
                        }
                      : {
                          marginBottom:
                            keyboardHeight > 0 ? 0 : safeArea.bottom,
                        }),
                    marginLeft: safeArea.left,
                    marginRight: safeArea.right,
                  },
                ]}
              >
                {children({
                  popAbove,
                  maxHeight,
                })}
              </View>
            </Animated.View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Portal>
  );
});
