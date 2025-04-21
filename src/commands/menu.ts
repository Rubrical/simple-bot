import { IChiakiCommand } from '../types';

const menu: IChiakiCommand = {
  command: {
    name: 'menu',
    aliases: ['menu'],
    category: 'geral',
    usage: '| [cmd]',
    description: 'Mostra lista de comandos'
  },

  async execute(client, flag, arg, M, rawMessage) {
    if (!client.cmd) return;

    const prefix = client.config.prefix;
    const commandList: string[] = [];

    for (const item of client.cmd.values()) {
      if (item.command.name && item.command.description && item.command.aliases) {
        commandList.push(
          `*🔹 ${item.command.name}*\n📝 Descrição: ${item.command.description}\n💻 Uso: ${prefix}${item.command.aliases}\n`
        );
      }
    }

    const messageText = `*📋 LISTA DE COMANDOS DISPONÍVEIS*\n\n${commandList.join('\n')}`;
    await client.sendMessage(M.from, { text: messageText }, { quoted: M });
  }
};

export default menu;
