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
                `
                *Nome Comando*: ${commandName}; \n
                *Descrição Comando:* ${commandDescription}; \n
                *Comando uso:* ${prefix}${commandAliases}; \n
                \n
                `
                commandList.push(commandInfo)
            }
            

        });

        const messageText = commandList.join('');        

        await client.sendMessage(
            M.from,
            { text: messageText },
            { quoted: M }
        );

    }
}


module.exports.command = {
    name: 'help',
    aliases: ['h', 'menu', 'list', 'commands', 'help'],
    category: 'general',
    usage: '| [cmd]',
    description: 'Mostra lista de comandos'
}