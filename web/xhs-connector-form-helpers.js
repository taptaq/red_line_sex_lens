export function readXhsConnectorDiscoveryPayload(root) {
  return {
    sourceType: String(root?.querySelector('[name="xhsConnectorSourceType"]')?.value || "").trim(),
    query: String(root?.querySelector('[name="xhsConnectorQuery"]')?.value || "").trim()
  };
}

export function readXhsConnectorSelectedIndexes(root) {
  return Array.from(root?.querySelectorAll('[name="xhsConnectorSelectedItem"]:checked') || [])
    .map((item) => Number(item?.value))
    .filter((value) => Number.isInteger(value) && value >= 0);
}
