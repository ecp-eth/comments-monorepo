#!/bin/bash

# Script: backup-nuke-restore.sh
# Usage: ./backup-nuke-restore.sh <folder_path> <command> [file1] [file2] ...
# Example: ./backup-nuke-restore.sh /tmp/build "npm run build" package.json src/

set -e  # Exit on any error

# Check if we have at least 2 arguments
if [ $# -lt 2 ]; then
    echo "Usage: $0 <folder_path> <command> [file1] [file2] ..."
    echo "Example: $0 /tmp/build \"npm run build\" package.json src/"
    exit 1
fi

FOLDER_PATH="$1"
COMMAND="$2"
shift 2  # Remove first two arguments, leaving only file paths

# Create a unique backup directory
BACKUP_DIR="$(pwd)/.tmp/backup-$(date +%s)-$$"

# Function to backup files
backup_files() {
    if [ $# -eq 0 ]; then
        echo "⚠️  No files specified to backup"
        return 0
    fi
    
    for file_path in "$@"; do
        # Handle both relative and absolute paths
        if [[ "$file_path" == /* ]]; then
            # Absolute path
            full_path="$file_path"
        else
            # Relative path from the folder
            full_path="$FOLDER_PATH/$file_path"
        fi
        
        if [ -e "$full_path" ]; then
            # Create directory structure in backup
            backup_path="$BACKUP_DIR/$file_path"
            backup_dir=$(dirname "$backup_path")
            # echo "💾 Backing up: $full_path to $backup_path in $backup_dir"
            mkdir -p "$backup_dir"
            
            # Copy file or directory
            cp -r "$full_path" "$backup_path"
            echo "✅ Backed up: $file_path"
        else
            echo "⚠️  File not found: $full_path"
        fi
    done
}

# Function to restore files
restore_files() {
    if [ ! -d "$BACKUP_DIR" ]; then
        echo "⚠️  No backup directory found: $BACKUP_DIR"
        return 0
    fi
    
    echo "🔄 Restoring files..."
    
    # Restore each backed up file
    find "$BACKUP_DIR" -type f | while read -r backup_item; do
        # Get relative path from backup directory
        relative_path="${backup_item#$BACKUP_DIR/}"
        
        # # Skip the backup directory itself (empty relative_path)
        # if [ -z "$relative_path" ]; then
        #     continue
        # fi
        
        # Determine target path
        if [[ "$relative_path" == /* ]]; then
            # Absolute path
            target_path="$relative_path"
        else
            # Relative path from the folder
            target_path="$FOLDER_PATH/$relative_path"
        fi
        
        # Create target directory if it doesn't exist
        target_dir=$(dirname "$target_path")
        # echo "🔄 Restoring: $backup_item to $target_path in $target_dir, relative path: $relative_path"
        mkdir -p "$target_dir"
        
        # Restore the file/directory
        if [ -d "$backup_item" ]; then
            rm -rf "$target_path"
            cp -r "$backup_item" "$target_path"
        else
            cp "$backup_item" "$target_path"
        fi
        
        echo "✅ Restored: $relative_path"
    done
}

# Function to cleanup backup
cleanup_backup() {
    if [ -d "$BACKUP_DIR" ]; then
        rm -rf "$BACKUP_DIR"
        echo "🧹 Cleaned up backup directory: $BACKUP_DIR"
    fi
}

# Main execution
main() {
    # Check if folder exists
    if [ ! -d "$FOLDER_PATH" ]; then
        echo "❌ Error: Folder does not exist: $FOLDER_PATH"
        exit 1
    fi
    
    # Safety guard: prevent nuking folders above current working directory
    CURRENT_DIR=$(pwd)
    FOLDER_ABSOLUTE_PATH=$(realpath "$FOLDER_PATH")
    
    # Check if the folder path is above or equal to current directory
    if [[ "$CURRENT_DIR" == "$FOLDER_ABSOLUTE_PATH" ]] || [[ "$CURRENT_DIR" == "$FOLDER_ABSOLUTE_PATH"* ]]; then
        echo "❌ Error: Cannot nuke folder '$FOLDER_PATH' as it contains or is above the current working directory"
        echo "   Current directory: $CURRENT_DIR"
        echo "   Target folder: $FOLDER_ABSOLUTE_PATH"
        echo "   This safety check prevents accidental deletion of important directories"
        exit 1
    fi

    echo "📁 Backing up files from: $FOLDER_PATH"
    echo "💾 Backup location: $BACKUP_DIR"

    mkdir -p "$BACKUP_DIR"
    
    # Backup specified files
    backup_files "$@"
    
    # Nuke the folder (remove everything except backed up files)
    echo "💥 Nuking folder: $FOLDER_PATH"
    rm -rf "$FOLDER_PATH"
    mkdir -p "$FOLDER_PATH"
    
    # Run the command
    echo "🚀 Running command: $COMMAND"
    echo "📂 Working directory: $CURRENT_DIR"
    
    # Change to the folder and run command
    cd "$CURRENT_DIR"
    
    # Run command and capture exit code
    set +e  # Don't exit on command failure
    eval "$COMMAND"
    COMMAND_EXIT_CODE=$?
    set -e  # Re-enable exit on error
    
    # Report command result
    if [ $COMMAND_EXIT_CODE -eq 0 ]; then
        echo "✅ Command completed successfully"
    else
        echo "❌ Command failed with exit code: $COMMAND_EXIT_CODE"
    fi
    
    # Ensure we are back in the current directory
    cd "$CURRENT_DIR"

    # Always restore files regardless of command success/failure
    restore_files
    
    # Cleanup backup
    cleanup_backup
    
    echo "🎉 Script completed. Command exit code: $COMMAND_EXIT_CODE"
    
    # Exit with the same code as the command
    exit $COMMAND_EXIT_CODE
}

# Trap to ensure cleanup happens even if script is interrupted
trap 'echo "🛑 Script interrupted. Restoring files..."; restore_files; cleanup_backup; exit 130' INT TERM

# Run main function
main "$@"
