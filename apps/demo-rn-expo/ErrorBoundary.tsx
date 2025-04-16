import React, { Component, ErrorInfo, ReactNode } from "react";
import { Text, View, DevSettings } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "./ui/Button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <SafeAreaView style={{ backgroundColor: "white", flex: 1 }}>
            <View style={{ flex: 1, padding: 30, gap: 20 }}>
              <Text
                style={{
                  color: "black",
                  fontWeight: "bold",
                  fontSize: 20,
                }}
              >
                Something went wrong.
              </Text>
              <Text>{this.state.error?.toString()}</Text>
              <Text>You may want to reset the app and try again:</Text>
              <Button
                onPress={() => {
                  DevSettings.reload();
                }}
              >
                Reset
              </Button>
            </View>
          </SafeAreaView>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
