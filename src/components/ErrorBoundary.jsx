import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F5F4F0] px-6">
          <div className="max-w-md w-full">
            <p className="text-xs font-semibold uppercase tracking-widest text-red-500">Something went wrong</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0D0D0D]">The app crashed.</h1>
            <p className="mt-2 text-sm text-[#6B6B6B]">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-xl bg-[#0D0D0D] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-80 transition-opacity"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
