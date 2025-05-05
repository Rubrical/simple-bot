import { proto } from "@whiskeysockets/baileys";
import { MessageService } from "../services/messages-service";
import { IChiakiCommand, ChiakiClient, SerializedMessage } from "../types/types";

const chance: IChiakiCommand = {
  command: {
    name: "chance",
    aliases: ["chance"],
    category: "brincadeiras",
    usage: "chance [mensagem]",
    description: "Diz a chance de algo acontecer.",
  },

  execute: async function (
    client: ChiakiClient,
    flag: string[],
    arg: string,
    M: SerializedMessage,
    rawMessage: proto.IWebMessageInfo[]
  ): Promise<void> {
    const msg = await MessageService.getMessage("joke", "chance");

    if (!msg || !msg.mensagem) {
      await M.reply("❌ Mensagem de brincadeira não encontrada no backend.");
      return;
    }

    if (!arg) {
      await M.reply("⚠️ Escreva uma situação para calcular a chance.");
      return;
    }

    const percentage = Math.floor(Math.random() * 101);
    const text = msg.mensagem
      .replace("{MSG}", arg)
      .replace("{PERCENTAGE}", `${percentage}`);

    const media = msg.midia ? await MessageService.getMedia(msg.midia) : null;

    await client.sendMessage(
      M.from,
      {
        ...(media ? { image: media, caption: text } : { text }),
        mentions: [M.sender],
      },
      { quoted: M }
    );
  },
};

export default chance;
