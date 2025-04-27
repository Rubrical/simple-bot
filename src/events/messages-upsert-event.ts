import { getContentType } from "@whiskeysockets/baileys";
import logger from "../logger";
import { ChiakiClient, MessagesUpsertType } from "../types/types";
import { serialize } from "../utils/serialize";
import { UsersService } from "../services/user-service";


export async function MessageUpsertEvent(messages: MessagesUpsertType, client: ChiakiClient) {
    logger.info("---- Mensagens abaixo -----");
    logger.info(JSON.stringify(messages));

    if (!messages.messages?.length || messages.type !== 'notify') return;

    const M = serialize(JSON.parse(JSON.stringify(messages.messages[0])), client);

    if (!M.message || !M.key || M.key.remoteJid === 'status@broadcast') return;
    if (['protocolMessage', 'senderKeyDistributionMessage', '', null].includes(M.type)) return;

    if (M.type === 'viewOnceMessageV2') {
        M.message = M.message[M.type].message;
        M.type = getContentType(M.message);
    }

    const { isGroup, sender, from, body } = M;
    if (!from || !sender) return;

    try {
        const remoteJid = client.utils.validateRemoteJid(sender).phoneNumber;
        const user = await UsersService.getUser(remoteJid);
        client.log.info(`${M.pushName}`);
        client.log.info(`${JSON.stringify(user)}`);

        if (user === false) {
            client.log.warn(`Aviso: erro em getUser`);
        } else if (user === null && remoteJid) {
            await UsersService.newUser({
                remoteJid: sender,
                userName: M.pushName
            });
        } else if (typeof user !== "boolean" && user.nome === "S/N") {
            await UsersService.updateUser({
                remoteJid: remoteJid,
                name: M.pushName,
                roleEnum: 3,
            });
        }

        if (!body) {
            if (isGroup) await UsersService.incrementMessages({ whatsappGroupId: from, remoteJid: sender });
            return;
        }

        const isCommand = body.startsWith(client.config.prefix);

        if (isGroup) {
            if (isCommand) {
                await UsersService.incrementCommands({ whatsappGroupId: from, remoteJid: sender });
            } else {
                await UsersService.incrementMessages({ whatsappGroupId: from, remoteJid: sender });
            }
        }

        if (!isCommand) return;

        const commandText = body.slice(client.config.prefix.length).trim();
        const [cmdName, ...args] = commandText.split(' ');
        const arg = args.filter((x) => !x.startsWith('--')).join(' ');
        const flag = args.filter((x) => x.startsWith('--'));

        const command = Array.from(client.cmd.values()).find(cmd =>
            cmd.command.aliases.includes(cmdName)
        );

        if (!command) {
            await M.reply('💔 *Comando não encontrado!!*');
            return;
        }

        if (isGroup && command.command.category === "moderação") {
            const gcMeta = await client.groupMetadata(from).catch(() => null);
            const groupAdmins = gcMeta?.participants.filter((v) => v.admin).map((v) => v.id) || [];

            if (!groupAdmins.includes(sender)) {
                await M.reply('🟨 *Usuário não é admin*');
                return;
            }

            const botId = client.user.id.split(':')[0] + '@s.whatsapp.net';
            if (!groupAdmins.includes(botId)) {
                await M.reply(`💔 *Desculpe, o ${client.config.name} não é um admin*`);
                return;
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