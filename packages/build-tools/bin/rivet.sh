#!/bin/bash

# Function to find .foundry-version file in current directory or parent directories
find_foundry_version_file() {
    local current_dir="$(pwd)"
    
    while [ "$current_dir" != "/" ]; do
        local version_file="$current_dir/.foundry-version"
        if [ -f "$version_file" ]; then
            echo "$version_file"
            return 0
        fi
        current_dir="$(dirname "$current_dir")"
    done
    
    return 1
}


# Check for version file and get target version
VERSION_FILE=$(find_foundry_version_file)
if [ -z "$VERSION_FILE" ]; then
    echo "❌ Error: No .foundry-version file found in current directory or any parent directory" >&2
    echo "   Please create a .foundry-version file with the desired foundry version (e.g., 'v1.2.3')" >&2
    echo "   Example: echo 'v1.2.3' > .foundry-version" >&2
    exit 1
fi

# Get target version from the file
TARGET_VERSION=$(cat "$VERSION_FILE" | tr -d '\n\r' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
if [ -z "$TARGET_VERSION" ]; then
    echo "❌ Error: .foundry-version file is empty: $VERSION_FILE" >&2
    exit 1
fi

# Ensure version starts with 'v' if it doesn't already
if [[ ! "$TARGET_VERSION" =~ ^v ]]; then
    TARGET_VERSION="v$TARGET_VERSION"
fi

# Show version source
echo "📋 Using foundry version from: $VERSION_FILE"
echo "🎯 Target version: $TARGET_VERSION"

# Function to check if foundry is installed
is_foundry_installed() {
    command -v forge >/dev/null 2>&1
}

# Function to check if foundry is installed via homebrew
is_foundry_homebrew() {
    if is_foundry_installed; then
        forge --version 2>/dev/null | head -n1 | grep -q "\-Homebrew"
    else
        return 1
    fi
}

# Function to get current foundry version
get_foundry_version() {
    if is_foundry_installed; then
        forge --version 2>/dev/null | head -n1 | grep -o 'v[0-9]\+\.[0-9]\+\.[0-9]\+' | head -n1
    else
        echo ""
    fi
}

# Function to detect user's shell
is_user_shell_zsh() {
    USER_SHELL=$(basename "${SHELL:-/bin/bash}")
    [ "$USER_SHELL" = "zsh" ] || echo "$SHELL" | grep -q "zsh"
}

# Function to install foundry
install_foundry() {
    echo "🔧 Foundry not found. Installing foundry..."
    curl -L https://foundry.paradigm.xyz | bash

    # Detect shell and source appropriate rc file
    # Since this script runs under sh, we need to detect the user's actual shell
    if is_user_shell_zsh; then
        echo "🔧 ZSH detected. Sourcing ~/.zshenv..."
        source ~/.zshenv 2>/dev/null || true
    else
        echo "🔧 BASH detected. Sourcing ~/.bashrc..."
        source ~/.bashrc 2>/dev/null || true
    fi

    # Check if foundryup is available
    if ! command -v foundryup >/dev/null 2>&1; then
        echo "❌ Failed to install foundry. Please run these commands manually:"
        if is_user_shell_zsh; then
            echo "   source ~/.zshenv # or start a new terminal"
        else
            echo "   source ~/.bashrc # or start a new terminal"
        fi
        echo "   foundryup"
        exit 1
    fi

    # Run foundryup to complete installation
    foundryup
    
    # Verify foundryup worked
    if ! command -v forge >/dev/null 2>&1; then
        echo "❌ Foundry installation failed. Please run these commands manually:"
        if is_user_shell_zsh; then
            echo "   source ~/.zshenv # or start a new terminal"
        else
            echo "   source ~/.bashrc # or start a new terminal"
        fi
        echo "   foundryup"
        exit 1
    fi
}

# Function to update foundry to target version
update_foundry() {
    echo "🔄 Foundry version mismatch. Updating to $TARGET_VERSION..."
    if command -v foundryup >/dev/null 2>&1; then
        foundryup --install "$TARGET_VERSION"
    else
        echo "❌ foundryup not found. Please run: foundryup --version $TARGET_VERSION"
        exit 1
    fi
}

# Main logic
main() {
    # Check if foundry is installed
    if ! is_foundry_installed; then
        install_foundry
    fi

    # Check if foundry is installed via homebrew
    if is_foundry_homebrew; then
        echo "❌ Error: Foundry is installed via Homebrew" >&2
        echo "   Homebrew does not support rolling back to specific versions" >&2
        echo "   Please uninstall foundry via Homebrew (this script will help with installing the correct version):" >&2
        echo "   brew uninstall foundry" >&2
        exit 1
    fi
    
    # Check version
    CURRENT_VERSION=$(get_foundry_version)
    if [ "$CURRENT_VERSION" != "$TARGET_VERSION" ]; then
        update_foundry
    fi
    
    # Verify installation and version
    if ! is_foundry_installed; then
        echo "❌ Foundry installation failed"
        exit 1
    fi
    
    FINAL_VERSION=$(get_foundry_version)
    if [ "$FINAL_VERSION" != "$TARGET_VERSION" ]; then
        echo "❌ Failed to update foundry to $TARGET_VERSION. Current version: $FINAL_VERSION"
        exit 1
    fi
    
    echo "✅ Foundry $TARGET_VERSION is ready"
    
    # Pass all arguments to the global foundry command
    # Determine which foundry command to use based on the script name or first argument
    if [ "$(basename "$0")" = "forge" ] || [ "$1" = "forge" ]; then
        forge "${@:2}"
    elif [ "$(basename "$0")" = "cast" ] || [ "$1" = "cast" ]; then
        cast "${@:2}"
    elif [ "$(basename "$0")" = "anvil" ] || [ "$1" = "anvil" ]; then
        anvil "${@:2}"
    elif [ "$(basename "$0")" = "chisel" ] || [ "$1" = "chisel" ]; then
        chisel "${@:2}"
    else
        # Default to forge if no specific command is detected
        forge "$@"
    fi
}

# Run main function
main "$@"
