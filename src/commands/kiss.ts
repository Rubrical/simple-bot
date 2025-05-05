import { proto } from "@whiskeysockets/baileys";
import { ChiakiClient, IChiakiCommand, SerializedMessage } from "../types/types";
import { MessageService } from "../services/messages-service";


const kiss: IChiakiCommand = {
    command: {
      name: "beijar",
      aliases: ["beijar"],
      category: "brincadeiras",
      usage: "beijar @usuário",
      description: "Beija outro usuário do grupo.",
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
        await M.reply("🚫 Você precisa marcar alguém para beijar!");
        return;
      }

      const msg = await MessageService.getMessage("joke", "beijar");

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

export default kiss;