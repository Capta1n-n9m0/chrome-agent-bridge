## Scripts from any folder

A script does not have to live in the repo. Give its own folder the SDK and `tsx`, and it can connect to the bridge
like any other client. Needs a built checkout (`npm run setup` or `npm install`) and Node.

1. In the script's folder, in PowerShell, one command per line:

   ```powershell
   npm init -y
   npm pkg set type=module
   npm install <repo>\sdk tsx
   ```

   `type=module` lets the script use top-level `await`. The first package is a `file:` dependency: npm puts a junction
   `node_modules\@bridge\sdk` that points into your checkout. It does not bring `tsx` or fetch the SDK's own packages
   (they come from the checkout), so `tsx` is a second package from the registry, fetched once; after that nothing
   needs the network. The SDK is TypeScript source with no build, so plain `node` cannot load it: run scripts with
   `npx tsx my-script.ts`.
2. Copy `examples/list-tabs.ts` there and run `npx tsx list-tabs.ts`. It prints each tab the client may see (handle,
   holder, title) and the count. The script changes no tab and no setting; `connect()` may start the daemon, or hand
   it over to a newer build, as any client does. A tab whose title the bridge withholds (the bridge is off, or a
   blocked site) shows as `(hidden: ...)`.
3. The token is found for you. The SDK looks for `BRIDGE_TOKEN`, else `bridge.token` in the checkout it was installed
   from (it walks up from its own folder, not from the script's). Never put the token in a script.
4. To type-check, put your own `tsconfig.json` in the folder (`module` and `moduleResolution` `NodeNext`, `strict`)
   and run the checkout's compiler:

   ```powershell
   node <repo>\node_modules\typescript\bin\tsc -p .
   ```

### Removing the folder safely

`node_modules\@bridge\sdk` is a junction into your checkout. Deleting the script's folder recursively can follow the
junction and empty the checkout's `sdk\`. Remove the junction first, in **PowerShell** (not Git Bash, whose
`cmd //c rmdir` leaves it in place):

```powershell
cmd /c rmdir node_modules\@bridge\sdk
```

Check that `<repo>\sdk\src` is still there, then delete the folder. `npm uninstall @bridge/sdk` also removes the
junction.
