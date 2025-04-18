module.exports.execute = async (client, flag, arg, M) => {
    if (!arg) {
        return await client.sendMessage(
            M.from,
            { text: `⚠️ Uso correto: ${client.config.prefix}help [comando]\nExemplo: ${client.config.prefix}help sticker` },
            { quoted: M }
        );
    }

    const commandName = arg.toLowerCase().trim();
    let command = client.cmd.get(commandName);

    if (!command) {
        for (const [name, cmd] of client.cmd.entries()) {
            if (cmd.command.aliases && 
                (Array.isArray(cmd.command.aliases) ? 
                    cmd.command.aliases.includes(commandName) : 
                    cmd.command.aliases === commandName)) {
                command = cmd;
                break;
            }
        }
    }

    if (!command) {
        return await client.sendMessage(
            M.from,
            { text: `❌ Comando "${commandName}" não encontrado. Use ${client.config.prefix}menu para ver todos os comandos disponíveis.` },
            { quoted: M }
        );
    }

    const prefix = client.config.prefix;
    const commandData = command.command;
    let helpText = `*📚 AJUDA: ${commandData.name}*\n\n`;

    helpText += `📝 *Descrição*: ${commandData.description || 'Sem descrição'}\n\n`;

    if (commandData.aliases && commandData.aliases.length > 0) {
        if (typeof commandData.aliases === 'string') {
            helpText += `🔄 *Aliases*: ${prefix}${commandData.aliases}\n\n`;
        } else {
            helpText += `🔄 *Aliases*: ${commandData.aliases.map(alias => `${prefix}${alias}`).join(', ')}\n\n`;
        }
    }

    if (commandData.category) {
        helpText += `🏷️ *Categoria*: ${commandData.category}\n\n`;
    }

    if (commandData.usage) {
        helpText += `💻 *Uso*: ${prefix}${commandData.name} ${commandData.usage}\n\n`;
    }

    if (commandData.examples) {
        helpText += `📋 *Exemplos*:\n`;
        if (Array.isArray(commandData.examples)) {
            commandData.examples.forEach(example => {
                helpText += `- ${prefix}${example}\n`;
            });
        } else {
            helpText += `- ${prefix}${commandData.examples}\n`;
        }
    }

    await client.sendMessage(
        M.from,
        { text: helpText },
        { quoted: M }
    );
}

module.exports.command = {
    name: 'help',
    aliases: ['help', 'ajuda', '?'],
    category: 'geral',
    usage: '[comando]',
    description: 'Mostra informações detalhadas sobre um comando específico',
    examples: ['help sticker', 'help menu']
}