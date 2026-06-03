export async function ensureContent(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["dist/content.js"],
  });
}

export async function callInPage<T>(
  tabId: number,
  fn: (...args: unknown[]) => T,
  args: unknown[] = [],
): Promise<T> {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: fn,
    args,
    world: "ISOLATED",
  });
  if (result?.result === undefined) throw new Error("page function returned no result");
  return result.result as T;
}
