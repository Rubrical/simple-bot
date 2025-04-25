import { getContentType } from "@whiskeysockets/baileys";
import logger from "../logger";
import { ChiakiClient, MessagesUpsertType } from "../types/types";
import { serialize } from "../utils/serialize";


export async function MessageUpsertEvent(messages: MessagesUpsertType, client: ChiakiClient) {
    logger.info("mensagens abaixo");
    logger.info(JSON.stringify(messages));

    if (!messages.messages || messages.messages.length === 0) return;
    if (messages.type !== 'notify') return;

    let M = serialize(JSON.parse(JSON.stringify(messages.messages[0])), client);

    if (!M.message) {
        client.log.warn('Mensagem sem conteúdo:', M);
        return;
    }

    try {
        if (!M.message || !M.key || M.key.remoteJid === 'status@broadcast') return;
        if (['protocolMessage', 'senderKeyDistributionMessage', '', null].includes(M.type)) return;
        if (M.type === 'viewOnceMessageV2') {
            M.message = M.message[M.type].message;
            M.type = getContentType(M.message);
        }

        const { isGroup, sender, from, body } = M;

        if (!body || !body.startsWith(client.config.prefix)) return;

        const commandText = body.slice(client.config.prefix.length).trim();
        const [cmdName, ...args] = commandText.split(' ');
        const arg = args.filter((x) => !x.startsWith('--')).join(' ');
        const flag = args.filter((x) => x.startsWith('--'));

        let gcMeta = null;
        let groupMembers = [];
        let groupAdmins = [];

        if (isGroup && from) {
            try {
                gcMeta = await client.groupMetadata(from);
                groupMembers = gcMeta.participants || [];
                groupAdmins = groupMembers.filter((v) => v.admin).map((v) => v.id);
            } catch (err) {
                client.log.error('Erro ao obter metadata do grupo:', err);
            }
        }

        const command = Array.from(client.cmd.values()).find(cmd =>
            cmd.command.aliases.includes(cmdName)
        );

        if (!command) {
            return M.reply('💔 *Comando não encontrado!!*');
        }

        if (isGroup && command.command.category === "moderação") {
            if (!groupAdmins.includes(sender)) {
                return M.reply('🟨 *Usuário não é admin*');
            }

            const botId = client.user.id.split(':')[0] + '@s.whatsapp.net';
            if (!groupAdmins.includes(botId)) {
                return M.reply(`💔 *Desculpe, o ${client.config.name} não é um admin*`);
            }
        }

        client.log.info(`Executando comando: ${command.command.name} para ${M.from}`);
        await command.execute(client, flag, arg, M, messages.messages);

    } catch (err) {
        if (err instanceof TypeError) {
            await client.sendMessage(M.from, { text: "O comando não foi utilizado corretamente." }, { quoted: M });
        }
        client.log.error('Erro ao processar mensagem:', err);
    }
}