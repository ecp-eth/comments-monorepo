// Global test setup that runs before each test file

// Extend global types for test contracts
declare global {
  // eslint-disable-next-line no-var
  var __DEV__: boolean;
  // eslint-disable-next-line no-var
  var __TEST_CONTRACTS__: {
    commentsAddress: `0x${string}`;
    channelManagerAddress: `0x${string}`;
    noopHookAddress: `0x${string}`;
    flatFeeHookAddress: `0x${string}`;
    legacyTakeChannelFeeHookAddress: `0x${string}`;
  };
}

// Set development flag
globalThis.__DEV__ = false;
