export class NotificationService {
    async sendWhatsApp(phone: string, apiKey: string, message: string): Promise<boolean> {
        try {
            const encodedMsg = encodeURIComponent(message)
            const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodedMsg}&apikey=${apiKey}`
            const res = await fetch(url)
            return res.ok
        } catch (e) {
            console.error('Failed to send WhatsApp', e)
            return false
        }
    }

    async sendTelegram(token: string, chatId: string, message: string): Promise<boolean> {
        try {
            const encodedMsg = encodeURIComponent(message)
            const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodedMsg}&parse_mode=HTML`
            const res = await fetch(url)
            return res.ok
        } catch (e) {
            console.error('Failed to send Telegram', e)
            return false
        }
    }

    async sendTest(provider: 'whatsapp' | 'telegram', config: any): Promise<{ success: boolean; error?: string }> {
        const testMsg = "🚀 <b>Release Analyzer: Test Notification</b>\nIf you see this message, your configuration is correct!"

        let ok = false
        if (provider === 'whatsapp') {
            ok = await this.sendWhatsApp(config.whatsappPhone, config.whatsappApiKey, testMsg)
        } else {
            ok = await this.sendTelegram(config.telegramBotToken, config.telegramChatId, testMsg)
        }

        return { success: ok, error: ok ? undefined : 'API Request failed. Check your credentials.' }
    }
}

export const notificationService = new NotificationService()
