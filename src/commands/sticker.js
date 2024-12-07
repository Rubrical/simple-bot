const { Sticker } = require('wa-sticker-formatter')

module.exports.execute = async (client, flag, arg, M) => {
    try {
        if (!M.messageTypes(M.type) && !M.messageTypes(M.quoted.mtype))
            return void M.reply('🟥 *Caption/Quote an image/video/gif message*')
        
        if (!M.mtype) await client.sendMessage(M.from, { text: "Execute o comando com uma imagem" }, { quoted: M })


        const pack = arg.split('|')
        const buffer = M.quoted ? await M.quoted.download() : await M.download()
        const sticker = await new Sticker(buffer, {
            pack: pack[1] ? pack[1].trim() : 'ChiakiBot ALPHA 0.1',
            author: pack[2] ? pack[2].trim() : `ChiakiBot`,
            quality: 70,
            type:
                flag.includes('--c') || flag.includes('--crop')
                    ? 'crop'
                    : flag.includes('--s') || flag.includes('--stretch')
                    ? 'default'
                    : flag.includes('--circle')
                    ? 'circle'
                    : 'full'
        }).build()
        await client.sendMessage(M.from, { sticker }, { quoted: M })
    } catch(err) {
        console.error(err)
        await client.sendMessage(M.from, { text: "um erro ocorreu" }, { quoted: M })
    }
}

module.exports.command = {
    name: 'sticker',
    aliases: ['s'],
    category: 'utils',
    usage: '[quote the video or image] |PackName|AuthorName',
    description: 'Converte uma imagem para sticker'
}
