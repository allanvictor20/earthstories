import { Component } from 'react';

/**
 * Catches render-time errors so one bad chart cannot blank the whole page.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Earth Stories crashed:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="status-screen" role="alert">
        <p className="status-screen__title">Something went wrong rendering your story.</p>
        <p className="status-screen__subtitle">{this.state.error.message}</p>
        <button
          type="button"
          className="submit-btn status-screen__action"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    );
  }
}
