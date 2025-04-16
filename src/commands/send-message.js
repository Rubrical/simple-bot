const axios = require('axios')
const baseUrl = 'http://localhost:3000/api/messages/'
const url = `${baseUrl}MENSAGEM_BOAS_VINDAS_GENÉRICA`

module.exports.execute = async (client, flag, arg, M) => {
    const message = (await axios.get(url)).data
    let image
    if (message.midia) {
        imagem = (await axios.get(`${baseUrl}upload/${message.midia}`, { responseType: 'arraybuffer' })).data
    }

    await client.sendMessage(M.from, {
        image: Buffer.from(imagem),
        caption: message.mensagem
    })
}

module.exports.command = {
    name: 'send-message',
    aliases: ['se'],
    category: 'general',
    usage: '[quote the bot message]',
    description: 'Retorna mensagem do back-end, caso haja imagem retorna imagem'
}
