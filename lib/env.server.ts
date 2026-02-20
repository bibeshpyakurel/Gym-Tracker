function getRequiredServerEnv(name: "OPENAI_API_KEY") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getInsightsAiEnv() {
  return {
    apiKey: getRequiredServerEnv("OPENAI_API_KEY"),
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  };
}
