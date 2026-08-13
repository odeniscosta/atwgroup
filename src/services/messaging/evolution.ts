type EvolutionConfig = {
  url: string;
  apiKey: string;
  instance: string;
};

export function createEvolutionClient(config: EvolutionConfig) {
  return {
    async sendText(phone: string, text: string) {
      const response = await fetch(config.url.replace(/\/$/, "") + "/message/sendText/" + config.instance, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: config.apiKey,
        },
        body: JSON.stringify({ number: phone, text }),
      });
      if (!response.ok) throw new Error("Evolution API request failed");
      return response.json() as Promise<unknown>;
    },
  };
}
