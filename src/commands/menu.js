module.exports.execute = async (client, flag, arg, M) => {
    if (client.cmd) {
        let commandList = [];
        client.cmd.forEach(item => {
            let commandName = item.command.name
            let commandDescription = item.command.description
            let commandAliases = item.command.aliases
            let prefix = client.config.prefix


            if (item.command.name && item.command.description && item.command.aliases) {
                let commandInfo =
                `*🔹 ${commandName}*
📝 Descrição: ${commandDescription}
💻 Uso: ${prefix}${commandAliases}
`
                commandList.push(commandInfo)
            }

        });

        const messageText = `*📋 LISTA DE COMANDOS DISPONÍVEIS*\n\n${commandList.join('\n')}`;

        await client.sendMessage(
            M.from,
            { text: messageText },
            { quoted: M }
        );

    }
}


module.exports.command = {
    name: 'menu',
    aliases: [ 'menu'],
    category: 'geral',
    usage: '| [cmd]',
    description: 'Mostra lista de comandos'
}