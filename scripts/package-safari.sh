#!/bin/zsh
set -euo pipefail

repo_dir="${0:A:h:h}"
source_dir="$repo_dir/extension/dist/safari"
project_dir="$repo_dir/safari-app"

cd "$repo_dir"
npm run build:safari

if [[ -e "$project_dir" ]]; then
  print -u2 "Safari project already exists: $project_dir"
  print -u2 "Move or remove it before generating a fresh project."
  exit 1
fi

if xcrun --find safari-web-extension-packager >/dev/null 2>&1; then
  packager="safari-web-extension-packager"
  platform_args=()
else
  packager="safari-web-extension-converter"
  platform_args=(--macos-only)
fi

xcrun "$packager" \
  "${platform_args[@]}" \
  --project-location "$project_dir" \
  --app-name "Safari Agent Bridge" \
  --bundle-identifier "dev.agentbridge.safari" \
  --swift \
  --copy-resources \
  --no-open \
  --no-prompt \
  "$source_dir"

# The converter enables outbound networking for the containing app but not always for the
# extension target. The background page needs it for ws://127.0.0.1:<port>.
extension_entitlements="$(find "$project_dir" -path '*Extension*' -name '*.entitlements' -print -quit)"
if [[ -n "$extension_entitlements" ]]; then
  /usr/libexec/PlistBuddy -c "Set :com.apple.security.network.client true" "$extension_entitlements" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Add :com.apple.security.network.client bool true" "$extension_entitlements"
fi

print "Created the Safari Xcode project in $project_dir"
print "Open it in Xcode and Run the macOS app target (the default 'Sign to Run Locally' is sufficient)."
