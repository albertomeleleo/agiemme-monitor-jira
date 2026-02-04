interface UploadProps {
    onUploadSuccess: () => void
    currentProject: string
}

export function Upload({ onUploadSuccess, currentProject }: UploadProps): JSX.Element {
    const handleUpload = async () => {
        try {
            if (!currentProject) return
            const result = await window.api.uploadFile(currentProject)
            if (result) {
                onUploadSuccess()
            }
        } catch (error) {
            console.error("Upload failed", error)
        }
    }

    return (
        <button
            onClick={handleUpload}
            disabled={!currentProject}
            className="px-4 py-2 bg-brand-cyan text-brand-deep rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110"
        >
            <span>PO</span> Import PDF
        </button>
    )
}
