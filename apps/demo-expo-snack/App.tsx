import { SafeAreaView, View } from "react-native";
import TextArea from "./ui/TextArea";
import Container from "./ui/Container";
import { ConnectButton } from "@reown/appkit-wagmi-react-native";
import Providers from "./Providers";
import SideBarLayout from "./components/SideBarLayout";
import { useAccount } from "wagmi";
import Home from "./screens/Home";

export default function App() {
  return (
    <Providers>
      <View
        style={{
          flex: 1,
          backgroundColor: "#ecf0f1",
        }}
      >
        <SideBarLayout>
          <Home />
        </SideBarLayout>
      </View>
    </Providers>
  );
}
