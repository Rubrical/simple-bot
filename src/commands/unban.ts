import { proto } from "@whiskeysockets/baileys";
import { BanService } from "../services/ban-service";
import { IChiakiCommand, ChiakiClient, SerializedMessage } from "../types/types";


const unbanUser: IChiakiCommand = {
    command: {
        name: "unban",
        aliases: ["unban"],
        category: "moderação",
        usage: "unban @99999999",
        description: "Remove o banimento de um usuário pelo ID do ban.",
    },
    execute: async function (client: ChiakiClient, flag: string[], arg: string, M: SerializedMessage, rawMessage: proto.IWebMessageInfo[]): Promise<void> {
        const numero = M.mentions[0];
        const groupId = M.from;

        if (!numero) {
            await M.reply("Você precisa marcar o usuário para desbanir.");
            return;
        }

        const result = await BanService.remove(numero, groupId);

        if (typeof result === "string") {
            await M.reply(result);
        } else if (result) {
            await M.reply("Usuário desbanido com sucesso.");
        } else {
            await M.reply("Erro ao desbanir o usuário.");
        }
    }
};

export default unbanUser