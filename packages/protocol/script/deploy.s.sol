// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { Script, console } from "forge-std/Script.sol";
import { CommentManager } from "../src/CommentManager.sol";
import { ChannelManager } from "../src/ChannelManager.sol";
import { NoopHook } from "../src/hooks/NoopHook.sol";
import { FlatFeeHook } from "../test/FlatFeeHook.t.sol";
import { BroadcastHook } from "../src/hooks/BroadcastHook.sol";

contract DeployScript is Script {
  enum Env {
    Dev,
    Prod,
    Test
  }

  CommentManager public comments;
  ChannelManager public channelManager;
  NoopHook public noopHook;
  FlatFeeHook public flatFeeHook;
  BroadcastHook public broadcastHook;

  function setUp() public {}

  function run(string calldata envInput) public {
    uint256 fallbackPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    Env env = getEnv(envInput);

    uint256 salt = uint256(0);

    bool isSimulation = vm.envOr("SIM", false);

    uint256 deployerPrivateKey = env == Env.Prod
      ? vm.envOr("PRIVATE_KEY", uint256(fallbackPrivateKey))
      : vm.envOr("CUSTOM_ANVIL_DEPLOYER_PRIVATE_KEY", fallbackPrivateKey); // Anvil test account private key
    address deployerAddressFromPrivateKey = vm.addr(deployerPrivateKey);
    address deployerAddress = vm.envOr(
      "PROD_DEPLOYER_ADDRESS",
      deployerAddressFromPrivateKey
    );
    address ownerAddress = vm.envOr("CONTRACT_OWNER_ADDRESS", deployerAddress);

    console.log(
      string.concat(isSimulation ? "Simulation " : "", "Deployer Address:"),
      deployerAddress
    );
    console.log(
      "Expected deployer from private key:",
      deployerAddressFromPrivateKey
    );

    // Verify sender configuration
    if (!isSimulation && deployerAddress != deployerAddressFromPrivateKey) {
      console.log(
        "WARNING: PROD_DEPLOYER_ADDRESS doesn't match private key address"
      );
      console.log("Using address from private key for broadcast");
      deployerAddress = deployerAddressFromPrivateKey;
    }

    if (isSimulation) {
      vm.startBroadcast(deployerAddress);
      console.log("Is Simulation");
    } else {
      vm.startBroadcast(deployerPrivateKey);
    }

    if (env == Env.Dev || env == Env.Test) {
      // Fund wallet with real identity for testing
      address fundAddress = vm.envAddress("FUND_ADDRESS");
      payable(fundAddress).transfer(1 ether);
    }

    if (env == Env.Test) {
      // We deploy the contract in different tests in sdk, so we want to have different addresses
      salt = uint256(
        bytes32(
          keccak256(
            abi.encodePacked(
              block.timestamp,
              block.prevrandao,
              block.coinbase,
              block.number,
              block.gaslimit,
              block.timestamp
            )
          )
        )
      );

      // Deploy NoopHook
      noopHook = new NoopHook();

      console.log("NoopHook deployed at", address(noopHook));

      // Deploy FlatFeeHook for testing
      flatFeeHook = new FlatFeeHook(ownerAddress);
      flatFeeHook.setShouldChargeOnEdit(true);

      console.log("FlatFeeHook deployed at", address(flatFeeHook));
    }

    // Deploy CommentManager first
    // by default, foundry runs the script with address 0x1804c8ab1f12e6bbf3894d4083f33e07309d1f38
    // (although this can be changed by setting --private-key or --sender)
    // that means `msg.sender` with this in `run()` script function is not the same as the deployer address
    // we need to set the contract owners to the deployer address initially so we can call `ownerOnly` functions
    try new CommentManager{ salt: bytes32(salt) }(deployerAddress) returns (
      CommentManager _comments
    ) {
      comments = _comments;
      console.log("CommentManager deployed at", address(comments));
    } catch Error(string memory reason) {
      console.log("CommentManager deployment failed:", reason);
      revert("CommentManager deployment failed");
    }
    // Deploy ChannelManager with CommentManager address
    try new ChannelManager{ salt: bytes32(salt) }(deployerAddress) returns (
      ChannelManager _channelManager
    ) {
      channelManager = _channelManager;
      console.log("ChannelManager deployed at", address(channelManager));
    } catch Error(string memory reason) {
      console.log("ChannelManager deployment failed:", reason);
      revert("ChannelManager deployment failed");
    }
    if (!isSimulation) {
      try comments.updateChannelContract(address(channelManager)) {
        console.log("CommentManager channel contract updated successfully");
      } catch Error(string memory reason) {
        console.log(
          "Failed to update CommentManager channel contract:",
          reason
        );
        revert("Contract configuration failed");
      }
      // Set contract owners
      try channelManager.transferOwnership(ownerAddress) {
        console.log("ChannelManager ownership transferred successfully");
      } catch Error(string memory reason) {
        console.log("Failed to transfer ChannelManager ownership:", reason);
        revert("Ownership transfer failed");
      }
      try comments.transferOwnership(ownerAddress) {
        console.log("CommentManager ownership transferred successfully");
      } catch Error(string memory reason) {
        console.log("Failed to transfer CommentManager ownership:", reason);
        revert("Ownership transfer failed");
      }
      if (env == Env.Prod) {
        string memory chainId = vm.envOr("CHAIN_ID", string("1"));
        string memory etherscanApiKey = vm.envOr(
          "ETHERSCAN_API_KEY",
          string("")
        );
        string memory verifierUrl = vm.envOr("VERIFIER_URL", string(""));

        // Set base uri to the nft-base-uri-server
        string memory baseUri = vm.envOr(
          "NFT_BASE_URI",
          string("https://nft.ethcomments.xyz")
        );
        string memory baseUriWithChainId = string.concat(
          baseUri,
          "/chain/",
          chainId,
          "/"
        );

        try channelManager.setBaseURI(baseUriWithChainId) {
          console.log("ChannelManager baseURI set to", baseUriWithChainId);
        } catch Error(string memory reason) {
          console.log("Failed to set ChannelManager baseURI:", reason);
          revert("BaseURI configuration failed");
        }
        // ABI-encode the constructor arguments using Solidity's built-in function
        bytes memory encodedArgs = abi.encode(deployerAddress);
        string memory encodedArgsStr = vm.toString(encodedArgs);

        // Verify contracts
        string[] memory channelManagerCmd = new string[](12);
        channelManagerCmd[0] = "forge";
        channelManagerCmd[1] = "verify-contract";
        channelManagerCmd[2] = vm.toString(address(channelManager));
        channelManagerCmd[3] = "src/ChannelManager.sol:ChannelManager";
        channelManagerCmd[4] = "--chain-id";
        channelManagerCmd[5] = chainId;
        channelManagerCmd[6] = "--etherscan-api-key";
        channelManagerCmd[7] = etherscanApiKey;
        channelManagerCmd[8] = "--verifier-url";
        channelManagerCmd[9] = verifierUrl;
        channelManagerCmd[10] = "--constructor-args";
        channelManagerCmd[11] = encodedArgsStr;

        string[] memory commentManagerCmd = new string[](12);
        commentManagerCmd[0] = "forge";
        commentManagerCmd[1] = "verify-contract";
        commentManagerCmd[2] = vm.toString(address(comments));
        commentManagerCmd[3] = "src/CommentManager.sol:CommentManager";
        commentManagerCmd[4] = "--chain-id";
        commentManagerCmd[5] = chainId;
        commentManagerCmd[6] = "--etherscan-api-key";
        commentManagerCmd[7] = etherscanApiKey;
        commentManagerCmd[8] = "--verifier-url";
        commentManagerCmd[9] = verifierUrl;
        commentManagerCmd[10] = "--constructor-args";
        commentManagerCmd[11] = encodedArgsStr;

        // Verify ChannelManager
        try vm.ffi(channelManagerCmd) returns (bytes memory result) {
          console.log("ChannelManager verified successfully");
          console.log("Verification result:", string(result));
        } catch Error(string memory reason) {
          console.log("ChannelManager verification failed:", reason);
        } catch {
          console.log("ChannelManager verification failed with unknown error");
        }
        // Verify CommentManager
        try vm.ffi(commentManagerCmd) returns (bytes memory result) {
          console.log("CommentManager verified successfully");
          console.log("Verification result:", string(result));
        } catch Error(string memory reason) {
          console.log("CommentManager verification failed:", reason);
        } catch {
          console.log("CommentManager verification failed with unknown error");
        }
        console.log(
          "\x1b[33m%s\x1b[0m",
          "Remember to update `packages/sdk/src/embed/schemas/index.ts` to include new chain into SDK."
        );
      } else {
        // Set base uri to the nft-base-uri-server
        string memory baseUri = "http://localhost:3007/chain/31337/";

        try channelManager.setBaseURI(baseUri) {
          console.log("ChannelManager baseURI set to", baseUri);
        } catch Error(string memory reason) {
          console.log("Failed to set ChannelManager baseURI:", reason);
          revert("BaseURI configuration failed");
        }
      }

      if (env == Env.Dev || env == Env.Test) {
        // Deploy BroadcastHook for testing and development
        broadcastHook = new BroadcastHook(address(channelManager));

        // these are default accounts from anvil
        broadcastHook.setWhitelistStatus(
          0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266,
          true
        );
        broadcastHook.setWhitelistStatus(
          0x70997970C51812dc3A010C7d01b50e0d17dc79C8,
          true
        );
        broadcastHook.setWhitelistStatus(
          0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC,
          true
        );
        broadcastHook.setWhitelistStatus(
          0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65,
          true
        );
        broadcastHook.setWhitelistStatus(
          0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc,
          true
        );
        broadcastHook.setWhitelistStatus(
          0x976EA74026E726554dB657fA54763abd0C3a0aa9,
          true
        );
        broadcastHook.setWhitelistStatus(
          0x14dC79964da2C08b23698B3D3cc7Ca32193d9955,
          true
        );
        broadcastHook.setWhitelistStatus(
          0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f,
          true
        );
        broadcastHook.setWhitelistStatus(
          0xa0Ee7A142d267C1f36714E4a8F75612F20a79720,
          true
        );

        console.log("BroadcastHook deployed at", address(broadcastHook));
      }
    }

    console.log("Deployment completed successfully");
    console.log("ChannelManager address:", address(channelManager));
    console.log("CommentManager address:", address(comments));

    vm.stopBroadcast();
  }

  function getEnv(string calldata envInput) private pure returns (Env) {
    // Convert string to enum
    Env env;

    if (
      keccak256(abi.encodePacked(envInput)) ==
      keccak256(abi.encodePacked("dev"))
    ) {
      env = Env.Dev;
      console.log("Running with env dev");
    } else if (
      keccak256(abi.encodePacked(envInput)) ==
      keccak256(abi.encodePacked("prod"))
    ) {
      env = Env.Prod;
      console.log("Running with env prod");
    } else if (
      keccak256(abi.encodePacked(envInput)) ==
      keccak256(abi.encodePacked("test"))
    ) {
      env = Env.Test;
      console.log("Running with env test");
    } else {
      revert("Invalid env. Use 'dev' or 'prod' or 'test'");
    }

    return env;
  }
}
