import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

/**
 * Catches render errors anywhere in the tree so a single broken page can
 * never blank the whole application (black screen).
 */
export default class ErrorBoundary extends Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    state: ErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('INIT.AI render error:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex h-screen flex-col items-center justify-center gap-4 bg-base px-6 text-center text-white">
                    <i className="fa-solid fa-triangle-exclamation text-3xl text-accent"></i>
                    <div>
                        <h2 className="mb-1 text-lg font-semibold">Something went wrong</h2>
                        <p className="text-sm text-[#888]">
                            The page hit an unexpected error. Reloading usually fixes it.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="cursor-pointer rounded-[14px] border-none bg-gradient-to-r from-primary to-accent px-6 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5"
                    >
                        Reload application
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
