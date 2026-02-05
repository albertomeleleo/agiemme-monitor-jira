import { useState } from 'react'
import { Modal, Input, Button, Typography, Card, Select } from '@design-system'

interface IssuesConfigModalProps {
    currentConfig: {
        notificationProvider?: 'whatsapp' | 'telegram'
        whatsappPhone?: string
        whatsappApiKey?: string
        telegramBotToken?: string
        telegramChatId?: string
        pollInterval?: number
        targetStatus?: string
        targetPriorities?: string[]
        jql?: string
    }
    onClose: () => void
    onSave: (config: any) => Promise<void>
}

export function IssuesConfigModal({ currentConfig, onClose, onSave }: IssuesConfigModalProps): JSX.Element {
    const [provider, setProvider] = useState<'whatsapp' | 'telegram'>(currentConfig.notificationProvider || 'whatsapp')

    // WhatsApp
    const [phone, setPhone] = useState(currentConfig.whatsappPhone || '')
    const [apiKey, setApiKey] = useState(currentConfig.whatsappApiKey || '')
    const [showWhatsappKey, setShowWhatsappKey] = useState(false)

    // Telegram
    const [botToken, setBotToken] = useState(currentConfig.telegramBotToken || '')
    const [showTelegramToken, setShowTelegramToken] = useState(false)
    const [chatId, setChatId] = useState(currentConfig.telegramChatId || '')

    const [interval, setInterval] = useState(currentConfig.pollInterval || 60)
    const [targetStatus, setTargetStatus] = useState(currentConfig.targetStatus || 'Done')
    const [targetPriorities, setTargetPriorities] = useState(currentConfig.targetPriorities ? currentConfig.targetPriorities.join(', ') : 'Critical, High')
    const [jql, setJql] = useState(currentConfig.jql || 'created >= -30d ORDER BY created DESC')
    const [testStatus, setTestStatus] = useState<{ success: boolean; msg: string } | null>(null)
    const [testing, setTesting] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleTestNotification = async () => {
        setTesting(true)
        setTestStatus(null)
        try {
            const config = provider === 'whatsapp'
                ? { whatsappPhone: phone, whatsappApiKey: apiKey }
                : { telegramBotToken: botToken, telegramChatId: chatId }

            const res = await window.api.testNotification(provider, config)
            if (res.success) {
                setTestStatus({ success: true, msg: 'Test notification sent!' })
            } else {
                setTestStatus({ success: false, msg: res.error || 'Failed to send test.' })
            }
        } catch (e: any) {
            setTestStatus({ success: false, msg: e.message })
        } finally {
            setTesting(false)
        }
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            await onSave({
                notificationProvider: provider,
                whatsappPhone: phone,
                whatsappApiKey: apiKey,
                telegramBotToken: botToken,
                telegramChatId: chatId,
                pollInterval: interval,
                targetStatus: targetStatus,
                targetPriorities: targetPriorities.split(',').map(s => s.trim()).filter(Boolean),
                jql: jql
            })
            onClose()
        } catch (e: any) {
            console.error(e)
            alert(`Failed to save configuration: ${e.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={<Typography variant="h2">Automation Settings</Typography>}
        >
            <div className="space-y-6">
                <div>
                    <Typography variant="h3" className="mb-2">Sync Configuration</Typography>
                    <Card variant="glass" className="p-4 space-y-4">
                        <div>
                            <Typography variant="caption" className="block mb-1 font-bold uppercase">JQL Query</Typography>
                            <Input
                                fullWidth
                                value={jql}
                                onChange={e => setJql(e.target.value)}
                                className="font-mono text-sm"
                            />
                        </div>
                    </Card>
                </div>

                <div>
                    <Typography variant="h3" className="mb-2">Notifications</Typography>
                    <Card variant="glass" className="p-4 space-y-4">
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <Typography variant="caption" className="block mb-1 font-bold uppercase">Provider</Typography>
                                <Select
                                    fullWidth
                                    value={provider}
                                    onChange={e => setProvider(e.target.value as any)}
                                >
                                    <option value="whatsapp">WhatsApp (CallMeBot)</option>
                                    <option value="telegram">Telegram</option>
                                </Select>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleTestNotification}
                                isLoading={testing}
                                disabled={provider === 'whatsapp' ? (!phone || !apiKey) : (!botToken || !chatId)}
                            >
                                Test
                            </Button>
                        </div>

                        {testStatus && (
                            <div className={`text-xs p-2 rounded border ${testStatus.success ? 'bg-green-900/20 border-green-900/50 text-green-400' : 'bg-red-900/20 border-red-900/50 text-red-400'}`}>
                                {testStatus.msg}
                            </div>
                        )}

                        {provider === 'whatsapp' ? (
                            <>
                                <Typography variant="body" className="text-gray-400 text-sm">
                                    We use <strong>CallMeBot</strong> (Free).
                                    <br />
                                    1. Add <code>+34 644 10 58 80</code> to Contacts.
                                    <br />
                                    2. Send <code>I allow callmebot to send me messages</code>.
                                    <br />
                                    3. Enter API Key below.
                                </Typography>

                                <div>
                                    <Typography variant="caption" className="block mb-1 font-bold uppercase">Phone (with Country Code)</Typography>
                                    <Input
                                        fullWidth
                                        placeholder="+39 333 1234567"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <Typography variant="caption" className="block mb-1 font-bold uppercase">API Key</Typography>
                                    <div className="relative">
                                        <Input
                                            fullWidth
                                            type={showWhatsappKey ? 'text' : 'password'}
                                            value={apiKey}
                                            onChange={e => setApiKey(e.target.value)}
                                            className="pr-12"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowWhatsappKey(!showWhatsappKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                        >
                                            {showWhatsappKey ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <Typography variant="body" className="text-gray-400 text-sm">
                                    Create a bot via <strong>@BotFather</strong>.
                                </Typography>

                                <div>
                                    <Typography variant="caption" className="block mb-1 font-bold uppercase">Bot Token</Typography>
                                    <div className="relative">
                                        <Input
                                            fullWidth
                                            type={showTelegramToken ? 'text' : 'password'}
                                            placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                                            value={botToken}
                                            onChange={e => setBotToken(e.target.value)}
                                            className="pr-12"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowTelegramToken(!showTelegramToken)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                        >
                                            {showTelegramToken ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <Typography variant="caption" className="block mb-1 font-bold uppercase">Chat ID</Typography>
                                    <Input
                                        fullWidth
                                        placeholder="123456789"
                                        value={chatId}
                                        onChange={e => setChatId(e.target.value)}
                                    />
                                    <Typography variant="caption" className="text-gray-500">Get it from @userinfobot</Typography>
                                </div>
                            </>
                        )}
                    </Card>
                </div>

                <div>
                    <Typography variant="h3" className="mb-2">Scheduler</Typography>
                    <Card variant="glass" className="p-4 space-y-4">
                        <div>
                            <Typography variant="caption" className="block mb-1 font-bold uppercase">Check Frequency (Minutes)</Typography>
                            <Input
                                fullWidth
                                type="number"
                                min={15}
                                value={interval}
                                onChange={e => setInterval(Number(e.target.value))}
                            />
                        </div>

                        <div>
                            <Typography variant="caption" className="block mb-1 font-bold uppercase">Notify on NEW Issue with Priority:</Typography>
                            <Input
                                fullWidth
                                placeholder="Critical, High"
                                value={targetPriorities}
                                onChange={e => setTargetPriorities(e.target.value)}
                            />
                            <Typography variant="caption" className="text-gray-500">Comma separated. Leave empty to disable.</Typography>
                        </div>

                        <div>
                            <Typography variant="caption" className="block mb-1 font-bold uppercase">Notify on Status Change To:</Typography>
                            <Input
                                fullWidth
                                placeholder="e.g. Done, Ready for QA"
                                value={targetStatus}
                                onChange={e => setTargetStatus(e.target.value)}
                            />
                            <Typography variant="caption" className="text-gray-500">Case-insensitive. Notification triggers when an issue enters this status.</Typography>
                        </div>
                    </Card>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave} isLoading={loading}>Save Configuration</Button>
                </div>
            </div>
        </Modal>
    )
}
