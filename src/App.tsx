import { hc } from 'hono/client';
import { Component, Suspense, use, type ReactNode } from 'react';
import type { AppType } from '../worker/app.ts';

const client = hc<AppType>('/');

// Created once at module scope: a promise made during render never settles for `use`.
const me = client.api.me.$get().then((response) => response.json());

export function App() {
  return (
    <main>
      <h1>trainote</h1>
      <LoadFailed>
        <Suspense fallback={<p>Signing in</p>}>
          <SignedInAs />
        </Suspense>
      </LoadFailed>
    </main>
  );
}

function SignedInAs() {
  const user = use(me);
  return <p>Signed in as {user.email}.</p>;
}

type LoadFailedProps = { children: ReactNode };
type LoadFailedState = { failed: boolean };

class LoadFailed extends Component<LoadFailedProps, LoadFailedState> {
  override state: LoadFailedState = { failed: false };

  static getDerivedStateFromError(): LoadFailedState {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? <p>Could not reach the server.</p> : this.props.children;
  }
}
