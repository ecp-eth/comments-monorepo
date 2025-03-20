
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color
GIT_REMOTE="origin"
DRY_RUN=false

# ensure we are in the root of the repo
cd $(git rev-parse --show-toplevel)
# ensure we are on the main branch
git checkout $(git rev-parse --abbrev-ref HEAD)

# ensure git workspace is clean
if [[ -n $(git status -s) ]]; then
    echo "${RED}❌ Git workspace is not clean. Please commit or stash your changes.${NC}"
    exit 1
fi

# ensure we are up to date
git pull

COMMIT_HASH=$(git rev-parse --short HEAD)
RELEASE_BRANCH_NAME="release-${COMMIT_HASH}"

# ensure sdk and shared were built
turbo run build lint test --filter=./packages/sdk... --filter=./packages/shared...

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
    echo "${RED}❌ Aborting release branch push${NC}"
    exit 1
fi

if [[ ! $DRY_RUN == "true" ]]; then
    # push the release branch to origin
    git push -u ${GIT_REMOTE} ${RELEASE_BRANCH_NAME}
fi


# publish
echo "${GREEN}🔔🔔🔔 Preparation Completed 🔔🔔🔔${NC}"
echo ""
echo "Now please ${YELLOW}👀 review the changes${NC}, then come back here to continue."
read -p "Reviewed? (y/N)" -n 1 -r

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "${RED}❌ Aborting publish${NC}"
    echo ""
    echo "You may want to run the following step manually:"
    echo ""
    echo "  1. review the PR changes"
    echo "  2. run 'pnpm changeset publish' to publish the changes"
    echo "  3. run 'git push --tags' to push tags"
    echo ""
    echo "Or otherwise delete the release branch manually:"
    echo ""
    echo "  1. run 'git push ${GIT_REMOTE} ${RELEASE_BRANCH_NAME}:' to delete the branch"
    echo "  2. run 'git branch -D ${RELEASE_BRANCH_NAME}:' to delete the branch"
    echo ""
    exit 1
fi

# generate proxy packages
pnpm run pkg:proxy-pkg:generate

if [[ ! $DRY_RUN == "true" ]]; then
    # publish changes
    pnpm changeset publish
else
    # dry run publish changes
    pnpm changeset publish --dry-run
fi

# clean up
git clean -df

if [[ ! $DRY_RUN == "true" ]]; then
    # push tags
    git push --tags
fi

echo "${GREEN}🥳🥳🥳 All done! 🥳🥳🥳${NC}"
