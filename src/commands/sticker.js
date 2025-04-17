const { Sticker, createSticker, StickerTypes } = require('wa-sticker-formatter')
const logger = require('../logger')
const fs = require('fs')
const path = require('path')
const { randomBytes } = require('crypto')

// Função de otimização para web
const getWebOptimizations = (isWeb) => ({
    reduceWhitePixels: isWeb,
    skipPixelsWhiteThreshold: isWeb ? 0.85 : 0,
    compression: isWeb ? 'high' : 'medium',
    removeAlpha: isWeb,
    optimizeVideo: true
})

module.exports.execute = async (client, flag, arg, M) => {
    await M.reply('⏱️ Aguarde a criação do seu sticker')

    const tempDir = path.join(__dirname, '..', 'temp')

    const ensureDirectoryExists = (dirPath) => {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true })
        }
    }

    try {
        ensureDirectoryExists(tempDir)

        const supportedTypes = ['imageMessage', 'videoMessage', 'stickerMessage']
        const isMediaValid = supportedTypes.includes(M.type) || 
                          (M.quoted && supportedTypes.includes(M.quoted.mtype))

        if (!isMediaValid) {
            return M.reply('❌ Envie ou marque uma imagem, vídeo ou GIF')
        }

        const parts = arg.split('|')
        const packName = parts[1]?.trim() || `✨ ${client.config.name}`
        const authorName = parts[2]?.trim() || client.config.name

        // Detecta se é WhatsApp Web
        const isWebClient = M.key.remoteJid.includes('@s.whatsapp.net') && 
                          !M.key.id.startsWith('3EB0')

        const baseOptions = {
            pack: packName,
            author: authorName,
            type: StickerTypes.FULL,
            quality: isWebClient ? 55 : 60,
            categories: ['🤩', '🎉'],
            id: randomBytes(16).toString('hex'),
            background: 'transparent',
            crop: true
        }

        // Aplica otimizações específicas
        const finalOptions = {
            ...baseOptions,
            ...getWebOptimizations(isWebClient)
        }

        let mediaBuffer
        try {
            mediaBuffer = M.quoted ? await M.quoted.download() : await M.download()

            if (mediaBuffer.length > 5 * 1024 * 1024) {
                return M.reply('⚠️ Arquivo muito grande (máx. ~5MB)')
            }
        } catch (error) {
            logger.error('Erro no download:', error)
            return M.reply('❌ Falha ao baixar a mídia')
        }

        const mediaType = M.quoted ? M.quoted.mtype : M.type
        const isVideo = mediaType === 'videoMessage'
        const isAnimated = mediaType === 'stickerMessage' && 
                         M.message?.stickerMessage?.isAnimated

        let sticker
        let tempFilePath = ''

        try {
            if (isVideo || isAnimated) {
                tempFilePath = path.join(tempDir, `temp_${Date.now()}.mp4`)
                fs.writeFileSync(tempFilePath, mediaBuffer)

                // Configurações específicas para web
                if (isWebClient) {
                    finalOptions.quality = 50
                    finalOptions.removeAlpha = true
                }

                sticker = await createSticker(tempFilePath, finalOptions)
            } else {
                sticker = await new Sticker(mediaBuffer, finalOptions).build()
            }

            await client.sendMessage(M.from, { sticker }, { quoted: M })

        } catch (error) {
            logger.error('Erro na criação:', error)

            let errorMsg = '❌ Erro ao criar figurinha'
            if (error.message.includes('duration too long')) {
                errorMsg = '⏱️ Vídeo muito longo (máx. 10 segundos)'
            } else if (error.message.includes('invalid file')) {
                errorMsg = '📁 Formato de arquivo inválido'
            } else if (error.message.includes('Input image exceeds pixel limit')) {
                errorMsg = '📏 Mídia muito grande (limite: ~5MB)'
            }

            await M.reply(errorMsg)
        } finally {
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath)
                } catch (cleanError) {
                    logger.warn('Falha na limpeza:', cleanError)
                }
            }
        }

    } catch (globalError) {
        logger.error('Erro global:', globalError)
        await M.reply('⚠️ Ocorreu um erro inesperado')
    }
}

module.exports.command = {
    name: 'sticker',
    aliases: ['s', 'figurinha', 'stiker', 'f'],
    category: 'utils',
    usage: '[marque mídia] |Nome Pacote|Autor',
    description: 'Converte imagens, vídeos e GIFs em figurinhas'
}