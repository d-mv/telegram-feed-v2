import { Component, type ReactNode } from "react";

type Props = {
	children: ReactNode;
	fallback?: ReactNode;
};

type State = {
	hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false };

	static getDerivedStateFromError(): State {
		return { hasError: true };
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback !== undefined) {
				return this.props.fallback;
			}
			return (
				<div role="alert" style={{ padding: 24, textAlign: "center" }}>
					<p>Something went wrong. Please refresh the page.</p>
				</div>
			);
		}
		return this.props.children;
	}
}
