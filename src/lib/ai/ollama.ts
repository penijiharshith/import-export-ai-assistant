import ollama from "ollama";

export const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5-coder:7b";

export { ollama };

export function getOllamaJsonContent(response: {
  message?: {
    content?: string | null;
  };
}) {
  const content = response.message?.content;

  if (!content) {
    throw new Error("Ollama response did not include JSON content.");
  }

  return content;
}
