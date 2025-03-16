import { useAccount } from "wagmi";
import Container from "../ui/Container";
import TextArea from "../ui/TextArea";
import { ConnectButton } from "@reown/appkit-wagmi-react-native";
import Button from "../ui/Button";
import { postComment } from "../lib/comments";
import { publicEnv } from "../env";
import { useState } from "react";

export default function Home() {
  const { address } = useAccount();
  const [text, setText] = useState("");

  return (
    <Container>
      <TextArea value={text} onChangeText={setText} />
      {address ? (
        <Button
          onPress={async () => {
            await postComment({
              content: text,
              // in react native app we will have to specify a targetUri that is owned by us
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
