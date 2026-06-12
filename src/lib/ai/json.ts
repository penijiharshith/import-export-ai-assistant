export function extractJsonObjectText(outputText: string) {
  const trimmed = outputText.trim();

  if (!trimmed) {
    return null;
  }

  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const firstObjectIndex = candidate.indexOf("{");
  const lastObjectIndex = candidate.lastIndexOf("}");

  if (firstObjectIndex === -1 || lastObjectIndex <= firstObjectIndex) {
    return null;
  }

  return candidate.slice(firstObjectIndex, lastObjectIndex + 1);
}

export function parseJsonObject(outputText: string): unknown {
  const jsonText = extractJsonObjectText(outputText);

  if (!jsonText) {
    return null;
  }

  try {
    return JSON.parse(jsonText) as unknown;
  } catch {
    return null;
  }
}
