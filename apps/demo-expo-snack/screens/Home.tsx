import { useAccount } from "wagmi";
import Container from "../ui/Container";
import TextArea from "../ui/TextArea";
import { ConnectButton } from "@reown/appkit-wagmi-react-native";
import Button from "../ui/Button";
import { postComment } from "../lib/comments";
import { publicEnv } from "../env";

export default function Home() {
  const { address } = useAccount();

  return (
    <Container>
      <TextArea />
      {address ? (
        <Button
          onPress={() => {
            postComment({
              content: "Hello, world!",
              targetUri: publicEnv.EXPO_PUBLIC_TARGET_URI,
              author: address,
              chainId: 1,
            });
          }}
        >
          Post comment
        </Button>
      ) : null}
      {!address ? (
        <ConnectButton label="Connect" loadingLabel="Connecting..." />
      ) : null}
    </Container>
  );
}
