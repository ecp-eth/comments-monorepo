#    .---------- constant part!
#    vvvv vvvv-- the code from above
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ensure we are in the root of the repo
cd $(git rev-parse --show-toplevel)

# ensure we are on the main branch
git checkout $(git rev-parse --abbrev-ref HEAD)

# ensure we are up to date
git pull

# ensure sdk was built
turbo run build lint test --filter=./packages/sdk...

# bump version
pnpm changeset version

# sync lock file
pnpm i
git add -A && git commit -m "chore: sync lock file"

# publish
echo "${GREEN}Preparation Complete!${NC}"
echo "Please ${RED}review the changes${NC}, then finish the publish with below commands:"
echo ""
echo "  1. run 'pnpm changeset publish' to publish the changes"
echo "  2. run 'git push' to push the changes to the main branch"
echo "  3. run 'git push --follow-tags' to push tags"
echo ""