export function readXhsConnectorDiscoveryPayload(root) {
  return {
    sourceType: String(root?.querySelector('[name="xhsConnectorSourceType"]')?.value || "").trim(),
    query: String(root?.querySelector('[name="xhsConnectorQuery"]')?.value || "").trim()
  };
}

export function readXhsConnectorSelectedKeys(root) {
  return Array.from(root?.querySelectorAll('[name="xhsConnectorSelectedItem"]:checked') || [])
    .map((item) => String(item?.value || "").trim())
    .filter(Boolean);
}
