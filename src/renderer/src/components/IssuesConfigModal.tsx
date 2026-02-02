import { useState, useEffect } from 'react'
import { Modal, Input, Button, Typography, Card, Select } from '@design-system'

interface IssuesConfigModalProps {
    currentConfig: {
        whatsappPhone?: string
        whatsappApiKey?: string
        pollInterval?: number
        targetStatus?: string
        jql?: string
    }
    onClose: () => void
    onSave: (config: any) => Promise<void>
}

export function IssuesConfigModal({ currentConfig, onClose, onSave }: IssuesConfigModalProps): JSX.Element {
    const [phone, setPhone] = useState(currentConfig.whatsappPhone || '')
    const [apiKey, setApiKey] = useState(currentConfig.whatsappApiKey || '')
    const [interval, setInterval] = useState(currentConfig.pollInterval || 60)
    const [targetStatus, setTargetStatus] = useState(currentConfig.targetStatus || 'Done')
    const [jql, setJql] = useState(currentConfig.jql || 'created >= -30d ORDER BY created DESC')
    const [loading, setLoading] = useState(false)
    const [projects, setProjects] = useState<any[]>([])
    const [selectedProject, setSelectedProject] = useState('')

    useEffect(() => {
        // Fetch projects
        window.api.jiraGetProjects()
            .then(setProjects)
            .catch(console.error)
    }, [])

    const handleProjectChange = (projectKey: string) => {
        setSelectedProject(projectKey)
        if (projectKey) {
            setJql(`project = "${projectKey}" AND created >= -30d ORDER BY created DESC`)
        }
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            await onSave({
                whatsappPhone: phone,
                whatsappApiKey: apiKey,
                pollInterval: interval,
                targetStatus: targetStatus,
                jql: jql
            })
            onClose()
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={<Typography variant="h2" neon>Automation Settings</Typography>}
        >
            <div className="space-y-6">
                <div>
                    <Typography variant="h3" className="mb-2">Sync Configuration</Typography>
                    <Card variant="glass" className="p-4 space-y-4">
                        <div>
                            <Typography variant="caption" className="block mb-1 font-bold uppercase">Select Project</Typography>
                            <Select
                                fullWidth
                                value={selectedProject}
                                onChange={e => handleProjectChange(e.target.value)}
                            >
                                <option value="">-- Custom JQL --</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.key}>{p.name} ({p.key})</option>
                                ))}
                            </Select>
                        </div>
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
                    <Typography variant="h3" className="mb-2">WhatsApp Notifications</Typography>
                    <Card variant="glass" className="p-4 space-y-4">
                        <Typography variant="body" className="text-gray-400 text-sm">
                            We use <strong>CallMeBot</strong> (Free) for notifications.
                            <br />
                            1. Add <code>+34 644 10 58 80</code> to Contacts.
                            <br />
                            2. Send <code>I allow callmebot to send me messages</code>.
                            <br />
                            3. Enter the API Key you receive below.
                        </Typography>

                        <div>
                            <Typography variant="caption" className="block mb-1 font-bold uppercase">Phone Number (with Country Code)</Typography>
                            <Input
                                fullWidth
                                placeholder="+39 333 1234567"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                            />
                        </div>

                        <div>
                            <Typography variant="caption" className="block mb-1 font-bold uppercase">API Key</Typography>
                            <Input
                                fullWidth
                                type="password"
                                placeholder="123456"
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                            />
                        </div>
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
