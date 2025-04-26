import { proto } from "@whiskeysockets/baileys";
import { BanService } from "../services/ban-service";
import { IChiakiCommand, ChiakiClient, SerializedMessage } from "../types/types";

const banUser: IChiakiCommand = {
    command: {
        name: "Banir",
        aliases: ["ban"],
        category: "moderação",
        usage: "ban @9999999999 <motivo>",
        description: "Bane o usuário mencionado do grupo.",
    },
    execute: async function (client: ChiakiClient, flag: string[], arg: string, M: SerializedMessage, rawMessage: proto.IWebMessageInfo[]): Promise<void> {
        const mentionedUser = M.mentions?.[0];
        const reason = arg.trim();

        if (!mentionedUser) {
            await M.reply("Você precisa marcar um usuário para banir.");
            return;
        }

        if (!reason) {
            await M.reply("Você precisa informar o motivo do banimento.");
            return;
        }

        if (!M.isGroup) {
            await M.reply("Este comando só pode ser usado em grupos.");
            return;
        }

        const req = {
            userRemoteJid: mentionedUser,
            groupRemoteJid: M.from,
            motivoBan: reason,
        };

        const result = await BanService.add(req);

        if (typeof result === "string") {
            await M.reply(result);
        } else if (result) {
            await M.reply("Usuário banido com sucesso.");
        } else {
            await M.reply("Erro ao banir o usuário.");
        }
    }
};

export default banUser;