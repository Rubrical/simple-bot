const { Boom } = require('@hapi/boom')
const {
    default: Baileys,
    DisconnectReason,
    useMultiFileAuthState,
    jidDecode,
    getContentType,
    downloadContentFromMessage
} = require('@whiskeysockets/baileys');
const P = require('pino')
const chalk = require('chalk')
const { join } = require('path')
const { readdirSync, remove } = require('fs-extra');
const utils = require('./utils');
const logger = require('./logger')

// get config
function getConfig() {
    return {
        name: 'ChiakiBot',
        prefix: process.env.PREFIX || '/',
    }
}


// decode ids
const decodeJid = (jid) => {
    const { user, server } = jidDecode(jid) || {}
    return user && server ? `${user}@${server}`.trim() : jid
}


// download media
const downloadMedia = async (message) => {
    /**@type {keyof proto.IMessage} */
    let type = Object.keys(message)[0]
    let M = message[type]
    if (type === 'buttonsMessage' || type === 'viewOnceMessageV2') {
        if (type === 'viewOnceMessageV2') {
            M = message.viewOnceMessageV2?.message
            type = Object.keys(M || {})[0]
        } else type = Object.keys(M || {})[1]
        M = M[type]
    }
    const stream = await downloadContentFromMessage(M, type.replace('Message', ''))
    let buffer = Buffer.from([])
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk])
    }
    return buffer
}


/**
 * Serializa mensagens do WhatsApp para um formato mais fácil de trabalhar
 * @param {Object} M - A mensagem recebida do WhatsApp
 * @param {Object} client - Instância do cliente Baileys
 * @returns {Object} Mensagem serializada com propriedades padronizadas
 */
function serialize(M, client) {
    // Verificação inicial da mensagem
    if (!M) return {};

    // Funções auxiliares locais
    const extractQuotedText = (quotedMsg, contentType) => {
        return quotedMsg[contentType]?.text ||
               quotedMsg[contentType]?.description ||
               quotedMsg[contentType]?.caption ||
               quotedMsg[contentType]?.hydratedTemplate?.hydratedContentText ||
               quotedMsg[contentType] ||
               '';
    };

    const extractMessageBody = (message, type) => {
        return message?.conversation ||
               message?.[type]?.text ||
               message?.[type]?.caption ||
               (type === 'listResponseMessage' && message?.[type]?.singleSelectReply?.selectedRowId) ||
               (type === 'buttonsResponseMessage' && message?.[type]?.selectedButtonId) ||
               (type === 'templateButtonReplyMessage' && message?.[type]?.selectedId) ||
               '';
    };

    // 1. Processamento das propriedades básicas da mensagem
    if (M.key) {
        M.id = M.key.id || '';
        M.isSelf = M.key.fromMe || false;
        M.from = decodeJid(M.key.remoteJid) || '';
        M.isGroup = M.from.endsWith('@g.us');
        M.sender = M.isGroup
            ? decodeJid(M.key.participant)
            : M.isSelf
                ? decodeJid(client.user.id)
                : M.from;
    }

    // 2. Processamento do conteúdo da mensagem
    if (M.message) {
        try {
            M.type = getContentType(M.message) || '';

            // 2.1. Tratamento de mensagens especiais (efêmeras, viewOnce)
            const processSpecialMessage = (msg) => {
                if (msg.ephemeralMessage) {
                    msg = msg.ephemeralMessage.message;
                    const contentType = getContentType(msg);
                    if (contentType === 'viewOnceMessageV2') {
                        msg = msg.viewOnceMessageV2.message;
                    }
                    return { message: msg, type: getContentType(msg) };
                }
                if (msg.viewOnceMessageV2) {
                    msg = msg.viewOnceMessageV2.message;
                    return { message: msg, type: getContentType(msg) };
                }
                return { message: msg, type: getContentType(msg) };
            };

            let processed = processSpecialMessage(M.message);
            M.message = processed.message;
            M.type = processed.type;

            // 2.2. Definição de tipos de mensagem válidos para stickers
            M.messageTypes = (type) => ['videoMessage', 'imageMessage', 'stickerMessage'].includes(type);

            // 3. Processamento de mensagens citadas (quoted)
            try {
                const quotedContext = M.message[M.type]?.contextInfo;

                if (quotedContext?.quotedMessage) {
                    let quotedMsg = quotedContext.quotedMessage;
                    let quotedType = 'normal';

                    // Processa mensagens citadas especiais
                    if (quotedMsg.ephemeralMessage) {
                        quotedMsg = quotedMsg.ephemeralMessage.message;
                        quotedType = 'ephemeral';
                    }
                    if (quotedMsg.viewOnceMessageV2) {
                        quotedMsg = quotedMsg.viewOnceMessageV2.message;
                        quotedType = 'view_once';
                    }

                    // Determina o tipo de conteúdo da mensagem citada
                    const quotedContentType = getContentType(quotedMsg);

                    M.quoted = {
                        type: quotedType,
                        stanzaId: quotedContext.stanzaId,
                        participant: decodeJid(quotedContext.participant),
                        message: quotedMsg,
                        mtype: quotedContentType,
                        isSelf: decodeJid(quotedContext.participant) === decodeJid(client.user.id),
                        text: extractQuotedText(quotedMsg, quotedContentType),
                        key: {
                            id: quotedContext.stanzaId,
                            fromMe: decodeJid(quotedContext.participant) === decodeJid(client.user.id),
                            remoteJid: M.from
                        },
                        download: () => downloadMedia(quotedMsg)
                    };
                } else {
                    M.quoted = null;
                }
            } catch (quotedError) {
                client.log.error('Erro ao processar mensagem citada:', quotedError);
                M.quoted = null;
            }

            // 4. Extração do corpo da mensagem
            M.body = extractMessageBody(M.message, M.type);

            // 5. Métodos auxiliares
            M.reply = (text, options = {}) => {
                return client.sendMessage(
                    M.from,
                    { text },
                    { quoted: M, ...options }
                );
            };

            // 6. Menções e anexos
            M.mentions = [];
            if (M.quoted?.participant) {
                M.mentions.push(M.quoted.participant);
            }

            const mentionedJids = M?.message?.[M.type]?.contextInfo?.mentionedJid || [];
            M.mentions.push(...mentionedJids.filter(Boolean));

            // 7. Utilitários de download e extração
            M.download = () => downloadMedia(M.message);
            M.numbers = client.utils.extractNumbers(M.body);
            M.urls = client.utils.extractUrls(M.body);

        } catch (messageError) {
            client.log.error('Erro ao serializar mensagem:', messageError);
            return {};
        }
    }

    return M;
}


// start bot
const start = async () => {
    const { state, saveCreds } = await useMultiFileAuthState('session');

    const client  = Baileys({
        auth: state,
        logger: P({ level: 'silent' }),
        printQRInTerminal: true
    });

    client.utils = utils
    client.config = getConfig()
    client.cmd = new Map()
    client.log = logger

    const isInstalled = client.utils.verifyIfFFMPEGisInstalled();

    if (!isInstalled) {
        logger.warn('O FFMPEG não está instalado, instále-o!')
        return
    }

    const loadCommands = async () => {
        const readCommand = (rootDir) => {
            const commandFiles = readdirSync(rootDir).filter((file) => file.endsWith('.js'));
            for (let file of commandFiles) {
                const cmd = require(join(rootDir, file));
                client.cmd.set(cmd.command.name, cmd);
                client.log.info(`Loaded: ${cmd.command.name.toUpperCase()} from ${file}`);
            }
            client.log.info('Successfully Loaded commands');
        };

        readCommand(join(__dirname, '.', 'commands'));
    };


    client.ev.on('creds.update', saveCreds)
    client.ev.on('connection.update', async (event) => {

        let connectionAttempts = 0
        const { connection, lastDisconnect } = event;
        if (connection === "close") {
            const shouldReconnect =
            (lastDisconnect?.error)?.output.statusCode !== DisconnectReason.loggedOut;

            if (connectionAttempts > 4) {
                logger.error("Não foi possível se conectar ao número especificado")
                return
            }

            client.log.info(`Conexão fechada, reconectando...: ${shouldReconnect}`,event);
            connectionAttempts++

            if (connectionAttempts <= 5) {
                await start();
            }
        }

        if (connection === "open") {
            client.log.info("Chiaki Bot! De pé e operante!", event);
            await loadCommands()
        }
    })

    // Entrada de mensagens
    client.ev.on('messages.upsert', async (messages) => {
        logger.info("mensagens abaixo")
        logger.info(JSON.stringify(messages))

        if (!messages.messages || messages.messages.length === 0) return
        if (messages.type !== 'notify') return;

        let M = serialize(JSON.parse(JSON.stringify(messages.messages[0])), client)

        if (!M.message) {
            client.log.warn('Mensagem sem conteúdo:', M)
            return
        }

        try {
            logger.info("M abaixo:")
            logger.info(JSON.stringify(M))

            // Validação básica de mensagem
            if (!M.message || !M.key || M.key.remoteJid === 'status@broadcast') return;
            if (['protocolMessage', 'senderKeyDistributionMessage', '', null].includes(M.type)) return;
            if (M.type === 'viewOnceMessageV2') {
                M.message = M.message[M.type].message;
                M.type = getContentType(M.message);
            }

            if (M.key.participant) {
                logger.info(`Mensagem recebida de ${M.key.participant} no grupo ${M.from}`)
            } else {
                logger.info(`Mensagem recebida de ${M.from}`)
            }

            const { isGroup, sender, from, body } = M;

            if (!body || !body.startsWith(client.config.prefix)) return;

            const commandText = body.slice(client.config.prefix.length).trim();
            const [cmdName, ...args] = commandText.split(' ');
            const arg = args.filter((x) => !x.startsWith('--')).join(' ');
            const flag = args.filter((x) => x.startsWith('--'));

            // Validação de grupo
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

            // Regras de moderação para grupos
            if (isGroup && command.command.category === 'moderation') {
                if (!groupAdmins.includes(sender)) {
                    return M.reply('🟨 *Usuário não é admin*');
                }

                const botId = client.user.id.split(':')[0] + '@s.whatsapp.net';
                if (!groupAdmins.includes(botId)) {
                    return M.reply(`💔 *Desculpe, o ${client.config.name} não é um admin*`);
                }
            }

            client.log.info(`Executando comando: ${command.command.name} para ${M.from}`);
            await command.execute(client, flag, arg, M, messages);

        } catch (err) {
            if (err instanceof TypeError) {
                await client.sendMessage(M.from, { text: "O comando não foi utilizado corretamente." }, { quoted: M })
            }

            client.log.error('Erro ao processar mensagem:', err);
        }
    });


    // Atualização de grupos
    client.ev.on('group-participants.update', async (event) => {
        client.log.info("----- participantes evento ------ ");
        client.log.info(JSON.stringify(event));

        const groupMetadata = await client.groupMetadata(event.id)

        const text = event.action === 'add'
        ? ` Seja muito bem-vindo(a) ao nosso grupo! => *${groupMetadata.subject}* -\n\n💈 *Descrição do Grupo:*\n${
            groupMetadata.desc || 'Sem descrição disponível.'
        }\n\nSiga as regras e se divirta!\n\n*‣ ${event.participants
            .map((jid) => `@${jid.split('@')[0]}`)
            .join(' ')}*`
        : event.action === 'remove'
        ? `Adeus *${event.participants
            .map((jid) => `@${jid.split('@')[0]}`)
            .join(', ')}* 👋🏻, sentiremos sua falta`
        : event.action === 'demote'
        ? `Usuário *@${event.participants[0].split('@')[0]}* foi rebaixado de cargo.`
        : `Digam olá ao novo ADM! *@${event.participants[0].split('@')[0]}*`;

        await client.sendMessage(event.id, {
            text,
            mentions: event.participants
        });
    });

    return client
}

start().catch(err => logger.error(err));
