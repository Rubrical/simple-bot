import makeWASocket, { useMultiFileAuthState, DisconnectReason, getContentType } from '@whiskeysockets/baileys';
import { readdirSync } from 'fs';
import { Boom } from '@hapi/boom';
import { join } from 'path';
import P from 'pino';
import logger from './logger';
import * as utils from './utils/utils';
import { serialize } from './utils/serialize';
import { ChiakiClient, ChiakiConfig, ChiakiCommand } from './types';

function getConfig(): ChiakiConfig {
    return {
        name: 'ChiakiBot',
        prefix: process.env.PREFIX || '/',
    }
}

const isBoom = (err: unknown): err is Boom => {
    return typeof err === 'object' && err !== null && 'isBoom' in err;
};

const start = async (): Promise<ChiakiClient | void> => {
    const { state, saveCreds } = await useMultiFileAuthState('session');

    const client = makeWASocket({
        auth: state,
        logger: P({ level: 'silent' }),
        printQRInTerminal: true
    }) as ChiakiClient;

    client.utils = utils;
    client.config = getConfig();
    client.cmd = new Map();
    client.log = logger;

    const isInstalled = client.utils.verifyIfFFMPEGisInstalled();
    if (!isInstalled) {
        logger.warn('O FFMPEG não está instalado, instále-o!');
        return;
    }

    const loadCommands = async () => {
        const readCommand = (rootDir: string) => {
            const commandFiles = readdirSync(rootDir).filter((file) => file.endsWith('.ts') || file.endsWith('.js'));

            for (const file of commandFiles) {
                const { default: cmd }: { default: ChiakiCommand } = require(join(rootDir, file));
                client.cmd.set(cmd.command.name, cmd);
                client.log.info(`Loaded: ${cmd.command.name.toUpperCase()} from ${file}`);
            }

            client.log.info('Successfully loaded commands');
        };

        readCommand(join(__dirname, '.', 'commands'));
    };


    client.ev.on('creds.update', saveCreds);
    client.ev.on('connection.update', async (event) => {
        let connectionAttempts = 0;
        const { connection, lastDisconnect } = event;

        if (connection === 'close') {
            const shouldReconnect = isBoom(lastDisconnect?.error) &&
                lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;

            if (connectionAttempts > 4) {
                logger.error("Não foi possível se conectar ao número especificado");
                return;
            }

            client.log.info(`Conexão fechada, reconectando...: ${shouldReconnect}`, event);
            connectionAttempts++;

            if (connectionAttempts <= 5) {
                await start();
            }
        }

        if (connection === 'open') {
            client.log.info("Chiaki Bot! De pé e operante!", event);
            await loadCommands();
        }
    });

    client.ev.on('messages.upsert', async (messages) => {
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
    });

    client.ev.on('group-participants.update', async (event) => {
        client.log.info("----- participantes evento ------ ");
        client.log.info(JSON.stringify(event));

        const groupMetadata = await client.groupMetadata(event.id);

        const text = event.action === 'add'
            ? ` Seja muito bem-vindo(a) ao nosso grupo! => *${groupMetadata.subject}* -\n\n💈 *Descrição do Grupo:*\n${groupMetadata.desc || 'Sem descrição disponível.'}\n\nSiga as regras e se divirta!\n\n*‣ ${event.participants.map((jid) => `@${jid.split('@')[0]}`).join(' ')}*`
            : event.action === 'remove'
                ? `Adeus *${event.participants.map((jid) => `@${jid.split('@')[0]}`).join(', ')}* 👋🏻, sentiremos sua falta`
                : event.action === 'demote'
                    ? `Usuário *@${event.participants[0].split('@')[0]}* foi rebaixado de cargo.`
                    : `Digam olá ao novo ADM! *@${event.participants[0].split('@')[0]}*`;

        await client.sendMessage(event.id, {
            text,
            mentions: event.participants
        });
    });

    return client;
};

start().catch(err => logger.error(err));
