import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ error, errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-white bg-brand-deep h-screen flex flex-col items-center justify-center">
                    <h1 className="text-3xl font-bold text-red-500 mb-4">Something went wrong.</h1>
                    <div className="glass-panel p-6 rounded-lg max-w-2xl w-full overflow-auto border border-white/10">
                        <h2 className="text-xl font-bold text-gray-300 mb-2">{this.state.error?.toString()}</h2>
                        <details className="whitespace-pre-wrap text-sm text-brand-text-sec font-mono">
                            <summary className="mb-2 cursor-pointer hover:text-white">Stack Trace</summary>
                            {this.state.errorInfo?.componentStack}
                        </details>
                    </div>
                    <button
                        className="mt-8 px-6 py-3 bg-brand-cyan text-brand-deep rounded-lg font-bold transition-all hover:brightness-110"
                        onClick={() => window.location.reload()}
                    >
                        Reload Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
