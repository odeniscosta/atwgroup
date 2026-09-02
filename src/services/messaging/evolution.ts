type EvolutionConfig = {
  url: string;
  apiKey: string;
  instance: string;
};

export type { EvolutionConfig };

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

/** Cria um cliente com a configuração cifrada do painel ou, como fallback, do ambiente. */
export async function createConfiguredEvolutionClient() {
  const { getNotificationSettings } = await import("@/server/notifications/notification-settings");
  const settings = await getNotificationSettings();
  if (!settings.whatsapp.apiUrl || !settings.whatsapp.apiKey || !settings.whatsapp.instance) return null;
  return createEvolutionClient({ url: settings.whatsapp.apiUrl, apiKey: settings.whatsapp.apiKey, instance: settings.whatsapp.instance });
}
