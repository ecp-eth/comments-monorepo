#!/bin/bash

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color
GIT_REMOTE="origin"
DRY_RUN=false

# ensure git workspace is clean
if [[ -n $(git status -s) ]]; then
    printf "${RED}❌ Git workspace is not clean. Please commit or stash your changes.${NC}"
    exit 1
fi

# ensure we are up to date
git pull

# TODO: ensure main is not ahead of origin/main

COMMIT_HASH=$(git rev-parse --short HEAD)
RELEASE_BRANCH_NAME="release-${COMMIT_HASH}"

# ensure sdk and shared were built
turbo run build lint test --filter=./packages/sdk... --filter=./packages/shared...

# check if release branch already exists
if git show-ref --verify --quiet refs/heads/$RELEASE_BRANCH_NAME; then
    printf "${RED}❌ Release branch '${RELEASE_BRANCH_NAME}' already exists. Please delete it first or use a different commit.${NC}\n"
    exit 1
fi

# we need to create a new branch for the release
git checkout -b $RELEASE_BRANCH_NAME

# bump version
pnpm changeset version

# sync lock file
pnpm i
git add -A && git commit --amend --no-edit

# ask for confirmation before proceeding
read -p "Ready to push release branch to ${GIT_REMOTE}? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    printf "${RED}❌ Aborting release branch push${NC}"
    exit 1
fi

if [[ ! $DRY_RUN == "true" ]]; then
    # push the release branch to origin
    git push -u ${GIT_REMOTE} ${RELEASE_BRANCH_NAME}
fi


# publish
printf "${GREEN}🔔🔔🔔 Preparation Completed 🔔🔔🔔${NC}"
printf ""
printf "Now please ${YELLOW}👀 review the changes${NC}, then come back here to continue."
read -p "Reviewed? (y/N)" -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    printf "${RED}❌ Aborting publish${NC}"
    printf ""
    printf "You may want to run the following step manually:"
    printf ""
    printf "  1. review the PR changes"
    printf "  2. run 'pnpm changeset publish' to publish the changes"
    printf "  3. run 'git push --tags' to push tags"
    printf ""
    printf "Or otherwise delete the release branch manually:"
    printf ""
    printf "  1. run 'git push ${GIT_REMOTE} :${RELEASE_BRANCH_NAME}' to delete the branch"
    printf "  2. run 'git branch -D ${RELEASE_BRANCH_NAME}' to delete the branch"
    printf ""
    exit 1
fi

if [[ ! $DRY_RUN == "true" ]]; then
    # publish changes
    pnpm changeset publish
else
    # dry run publish changes
    pnpm changeset publish --dry-run
fi

if [[ ! $DRY_RUN == "true" ]]; then
    # push tags
    git push --tags
fi

printf "${GREEN}🥳🥳🥳 All done! 🥳🥳🥳${NC}"
