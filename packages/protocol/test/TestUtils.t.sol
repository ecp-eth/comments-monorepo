// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { TestUtils } from "./utils.sol";

/**
 * @title TestUtilsTest
 * @notice Test contract for the TestUtils library
 */
contract TestUtilsTest is Test {
  using TestUtils for string;

  /**
   * @notice Test the parseEthAmount function with various inputs
   */
  function testParseEthAmount() public pure {
    // Test case 1: Valid whole number with space
    (bool found1, uint256 amount1) = TestUtils.parseEthAmount(
      bytes("1 ETH"),
      0
    );
    assertTrue(found1, "Should find valid whole number with space");
    assertEq(amount1, 1 ether, "Should parse 1 ETH correctly");

    // Test case 2: Valid whole number without space
    (bool found2, uint256 amount2) = TestUtils.parseEthAmount(bytes("1ETH"), 0);
    assertTrue(found2, "Should find valid whole number without space");
    assertEq(amount2, 1 ether, "Should parse 1ETH correctly");

    // Test case 3: Valid decimal with space
    (bool found3, uint256 amount3) = TestUtils.parseEthAmount(
      bytes("0.1 ETH"),
      0
    );
    assertTrue(found3, "Should find valid decimal with space");
    assertEq(amount3, 0.1 ether, "Should parse 0.1 ETH correctly");

    // Test case 4: Valid decimal without space
    (bool found4, uint256 amount4) = TestUtils.parseEthAmount(
      bytes("0.1ETH"),
      0
    );
    assertTrue(found4, "Should find valid decimal without space");
    assertEq(amount4, 0.1 ether, "Should parse 0.1ETH correctly");

    // Test case 5: Valid decimal with more precision
    (bool found5, uint256 amount5) = TestUtils.parseEthAmount(
      bytes("0.01 ETH"),
      0
    );
    assertTrue(found5, "Should find valid decimal with more precision");
    assertEq(amount5, 0.01 ether, "Should parse 0.01 ETH correctly");

    // Test case 6: Invalid format - missing number
    (bool found6, ) = TestUtils.parseEthAmount(bytes("ETH"), 0);
    assertFalse(found6, "Should not find amount with missing number");

    // Test case 7: Invalid format - invalid number
    (bool found7, ) = TestUtils.parseEthAmount(bytes("abcd ETH"), 0);
    assertFalse(found7, "Should not find amount with invalid number");

    // Test case 8: Invalid format - missing ETH suffix
    (bool found8, ) = TestUtils.parseEthAmount(bytes("1"), 0);
    assertFalse(found8, "Should not find amount with missing ETH suffix");

    // Test case 9: Invalid format - wrong ETH suffix
    (bool found9, ) = TestUtils.parseEthAmount(bytes("1 ETC"), 0);
    assertFalse(found9, "Should not find amount with wrong ETH suffix");

    // Test case 10: Case insensitive ETH suffix
    (bool found10, uint256 amount10) = TestUtils.parseEthAmount(
      bytes("1 eth"),
      0
    );
    assertTrue(found10, "Should find amount with lowercase ETH suffix");
    assertEq(amount10, 1 ether, "Should parse 1 eth correctly");

    // Test case 11: Parse from middle of string
    (bool found11, uint256 amount11) = TestUtils.parseEthAmount(
      bytes("Here's 1 ETH for you"),
      7
    );
    assertTrue(found11, "Should find amount in middle of string");
    assertEq(
      amount11,
      1 ether,
      "Should parse 1 ETH from middle of string correctly"
    );

    // Test case 12: Parse with multiple spaces
    (bool found12, uint256 amount12) = TestUtils.parseEthAmount(
      bytes("1   ETH"),
      0
    );
    assertTrue(found12, "Should find amount with multiple spaces");
    assertEq(amount12, 1 ether, "Should parse 1   ETH correctly");
  }

  /**
   * @notice Test the parseAndConvertAmount function with various number formats
   */
  function testParseAndConvertAmount() public pure {
    // Test case 1: Whole number
    (bool found1, uint256 amount1) = TestUtils.parseAndConvertAmount(
      bytes("1"),
      0,
      1
    );
    assertTrue(found1, "Should find valid whole number");
    assertEq(amount1, 1 ether, "Should parse 1 correctly");

    // Test case 2: Zero
    (bool found2, uint256 amount2) = TestUtils.parseAndConvertAmount(
      bytes("0"),
      0,
      1
    );
    assertTrue(found2, "Should find zero");
    assertEq(amount2, 0, "Should parse 0 correctly");

    // Test case 3: Decimal number
    (bool found3, uint256 amount3) = TestUtils.parseAndConvertAmount(
      bytes("0.1"),
      0,
      3
    );
    assertTrue(found3, "Should find valid decimal number");
    assertEq(amount3, 0.1 ether, "Should parse 0.1 correctly");

    // Test case 4: Decimal number with more precision
    (bool found4, uint256 amount4) = TestUtils.parseAndConvertAmount(
      bytes("0.01"),
      0,
      4
    );
    assertTrue(found4, "Should find valid decimal with more precision");
    assertEq(amount4, 0.01 ether, "Should parse 0.01 correctly");

    // Test case 5: Large whole number
    (bool found5, uint256 amount5) = TestUtils.parseAndConvertAmount(
      bytes("1000"),
      0,
      4
    );
    assertTrue(found5, "Should find valid large whole number");
    assertEq(amount5, 1000 ether, "Should parse 1000 correctly");

    // Test case 6: Number with multiple decimal places
    (bool found6, uint256 amount6) = TestUtils.parseAndConvertAmount(
      bytes("0.001"),
      0,
      5
    );
    assertTrue(found6, "Should find valid number with multiple decimal places");
    assertEq(amount6, 0.001 ether, "Should parse 0.001 correctly");

    // Test case 7: Invalid range
    (bool found7, uint256 amount7) = TestUtils.parseAndConvertAmount(
      bytes("1"),
      2,
      1
    );
    assertFalse(found7, "Should not find amount with invalid range");
    assertEq(amount7, 0, "Should return 0 for invalid range");

    // Test case 8: Empty string
    (bool found8, uint256 amount8) = TestUtils.parseAndConvertAmount(
      bytes(""),
      0,
      0
    );
    assertFalse(found8, "Should handle empty string");
    assertEq(amount8, 0, "Should return 0 for empty string");

    // Test case 9: Number with leading zeros
    (bool found9, uint256 amount9) = TestUtils.parseAndConvertAmount(
      bytes("001"),
      0,
      3
    );
    assertTrue(found9, "Should handle number with leading zeros");
    assertEq(amount9, 1 ether, "Should parse 001 correctly");

    // Test case 10: Decimal with leading zeros
    (bool found10, uint256 amount10) = TestUtils.parseAndConvertAmount(
      bytes("0.001"),
      0,
      5
    );
    assertTrue(found10, "Should handle decimal with leading zeros");
    assertEq(amount10, 0.001 ether, "Should parse 0.001 correctly");

    // Test case 11: Number with trailing zeros after decimal
    (bool found11, uint256 amount11) = TestUtils.parseAndConvertAmount(
      bytes("1.00"),
      0,
      4
    );
    assertTrue(
      found11,
      "Should handle number with trailing zeros after decimal"
    );
    assertEq(amount11, 1 ether, "Should parse 1.00 correctly");
  }
}
