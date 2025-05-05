import { proto } from "@whiskeysockets/baileys";
import { MessageService } from "../services/messages-service";
import { IChiakiCommand, ChiakiClient, SerializedMessage } from "../types/types";

const steal: IChiakiCommand = {
    command: {
      name: "roubar",
      aliases: ["roubar"],
      category: "brincadeiras",
      usage: "roubar @usuário",
      description: "Rouba tudo de alguém no grupo.",
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
        await M.reply("❌ Você precisa mencionar alguém para roubar!");
        return;
      }

      const msg = await MessageService.getMessage("joke", "roubar");
      if (!msg || !msg.mensagem) {
        await M.reply("❌ Mensagem de brincadeira não encontrada no backend.");
        return;
      }

      const imageBuffer = msg.midia ? await MessageService.getMedia(msg.midia) : null;
      const text = msg.mensagem
        .replace("{A}", `@${M.sender.split("@")[0]}`)
        .replace("{B}", `@${mentioned.split("@")[0]}`);

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
          mentions: [M.sender, mentioned],
        },
        { quoted: M }
      );
    },
  };

export default steal;