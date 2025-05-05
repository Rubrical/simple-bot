import { proto } from "@whiskeysockets/baileys";
import { MessageService } from "../services/messages-service";
import { IChiakiCommand, ChiakiClient, SerializedMessage } from "../types/types";

const slap: IChiakiCommand = {
  command: {
    name: "tapa",
    aliases: ["tapa"],
    category: "brincadeiras",
    usage: "tapa @usuário",
    description: "Dá um tapa em alguém do grupo.",
  },

  execute: async function (
    client: ChiakiClient,
    flag: string[],
    arg: string,
    M: SerializedMessage,
    rawMessage: proto.IWebMessageInfo[]
  ): Promise<void> {
    const mentioned = M.mentions?.[0];

    if (!mentioned) {
      await M.reply("🚫 Você precisa marcar alguém para dar o tapa!");
      return;
    }

    const msg = await MessageService.getMessage("joke", "tapa");

    if (!msg || !msg.mensagem) {
      await M.reply("❌ Mensagem de brincadeira não encontrada no backend.");
      return;
    }

    const imageBuffer = msg.midia ? await MessageService.getMedia(msg.midia) : null;

    const text = `${msg.mensagem} @${mentioned.split("@")[0]}`;

    await client.sendMessage(
      M.from,
      {
        ...(imageBuffer
          ? {
              image: imageBuffer,
              caption: text,
            }
          : {
              text,
            }),
        mentions: [mentioned],
      },
      { quoted: M }
    );
  },
};

export default slap;
