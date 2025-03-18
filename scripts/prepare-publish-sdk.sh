#    .---------- constant part!
#    vvvv vvvv-- the code from above
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# ensure we are in the root of the repo
cd $(git rev-parse --show-toplevel)

# ensure we are on the main branch
git checkout $(git rev-parse --abbrev-ref HEAD)

# ensure we are up to date
git pull

COMMIT_HASH=$(git rev-parse --short HEAD)
RELEASE_BRANCH_NAME="release-${COMMIT_HASH}"

# ensure sdk was built
turbo run build lint test --filter=./packages/sdk...

# we need to create a new branch for the release
git checkout -b $RELEASE_BRANCH_NAME

# bump version
pnpm changeset version

# sync lock file
pnpm i
git add -A && git commit -m "chore: sync lock file"

# publish
echo "${GREEN}🥳🥳🥳 Preparation Completed 🥳🥳🥳 ${NC}"
echo ""
echo "Please ${YELLOW}👀 review the changes${NC}, then finish the publish with below commands:"
echo ""
echo "  1. run 'pnpm changeset publish' to publish the changes"
echo "  2. run 'git push -u origin ${RELEASE_BRANCH_NAME}' to push the branch to origin"
echo "  3. run 'git push --follow-tags' to push tags"
echo ""