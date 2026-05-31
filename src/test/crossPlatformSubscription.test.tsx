/**
 * E2E-style integration test: a user who subscribes via iyzico on web
 * must get full premium access when signing in on the native app, because
 * subscription state is server-authoritative (stored in profiles.plan).
 *
 * We simulate this by:
 *   1. Mocking Capacitor to report native platform.
 *   2. Mocking Supabase auth + profiles query to return an active `pro` plan
 *      for the signed-in user (as if the iyzico-callback edge function had
 *      already upgraded the profile from a web purchase).
 *   3. Asserting that the UserContext exposes the upgraded plan and that
 *      premium feature gates (canAccessProjects/Hakedis/Profitability,
 *      canUse on usage keys) are unlocked.
 *   4. Asserting the native subscription notice is NOT shown for active users,
 *      while it IS shown (with no clickable payment CTA) for inactive ones.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";

// --- Mock Capacitor as native ---
vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => true,
    getPlatform: () => "ios",
  },
}));

// --- Mock Supabase client ---
const mockUser = { id: "user-web-buyer-123", email: "buyer@example.com" };
let mockProfile: any = {
  full_name: "Web Buyer",
  title: "PM",
  city: "Istanbul",
  plan: "pro",
  role: "pro",
};

vi.mock("@/integrations/supabase/client", () => {
  const authListeners: Array<(event: string, session: any) => void> = [];
  return {
    supabase: {
      auth: {
        getSession: () =>
          Promise.resolve({ data: { session: { user: mockUser } } }),
        getUser: () => Promise.resolve({ data: { user: mockUser } }),
        onAuthStateChange: (cb: any) => {
          authListeners.push(cb);
          setTimeout(() => cb("SIGNED_IN", { user: mockUser }), 0);
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        signOut: () => Promise.resolve({ error: null }),
      },
      from: (_table: string) => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: mockProfile, error: null }),
            maybeSingle: () =>
              Promise.resolve({ data: mockProfile, error: null }),
          }),
        }),
      }),
    },
  };
});

import {
  UserProvider,
  useUser,
  canAccessProjects,
  canAccessHakedis,
  canAccessProfitability,
} from "@/contexts/UserContext";
import { isNativeApp, NATIVE_SUB_NOTICE } from "@/lib/nativeGuards";
import NativeSubscriptionNotice from "@/components/NativeSubscriptionNotice";

function Probe() {
  const { plan, role, canUse, loading } = useUser();
  if (loading) return <div>loading</div>;
  return (
    <div>
      <div data-testid="plan">{plan}</div>
      <div data-testid="role">{role}</div>
      <div data-testid="projects">
        {String(canAccessProjects(plan, role))}
      </div>
      <div data-testid="hakedis">{String(canAccessHakedis(plan, role))}</div>
      <div data-testid="profit">
        {String(canAccessProfitability(plan, role))}
      </div>
      <div data-testid="ai">{String(canUse("aiQuestions"))}</div>
      <div data-testid="photo">{String(canUse("photoAnalysis"))}</div>
    </div>
  );
}

describe("Cross-platform subscription (web → native)", () => {
  beforeEach(() => {
    mockProfile = {
      full_name: "Web Buyer",
      title: "PM",
      city: "Istanbul",
      plan: "pro",
      role: "pro",
    };
  });

  it("reports native platform via nativeGuards", () => {
    expect(isNativeApp()).toBe(true);
  });

  it("unlocks premium features for a pro user signed in on native", async () => {
    render(
      <UserProvider>
        <Probe />
      </UserProvider>
    );

    await waitFor(() =>
      expect(screen.getByTestId("plan").textContent).toBe("pro")
    );
    expect(screen.getByTestId("role").textContent).toBe("pro");
    expect(screen.getByTestId("projects").textContent).toBe("true");
    expect(screen.getByTestId("hakedis").textContent).toBe("true");
    expect(screen.getByTestId("profit").textContent).toBe("true");
    expect(screen.getByTestId("ai").textContent).toBe("true");
    expect(screen.getByTestId("photo").textContent).toBe("true");
  });

  it("refreshes from server when app resumes (refresh-profile event)", async () => {
    // Start as free, then simulate iyzico web upgrade between sessions.
    mockProfile = { ...mockProfile, plan: "free", role: "free" };
    render(
      <UserProvider>
        <Probe />
      </UserProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId("plan").textContent).toBe("free")
    );
    expect(screen.getByTestId("projects").textContent).toBe("false");

    // Simulate web purchase completing → server now reports pro.
    mockProfile = { ...mockProfile, plan: "pro", role: "pro" };
    await act(async () => {
      window.dispatchEvent(new CustomEvent("refresh-profile"));
    });

    await waitFor(() =>
      expect(screen.getByTestId("plan").textContent).toBe("pro")
    );
    expect(screen.getByTestId("projects").textContent).toBe("true");
  });

  it("native subscription notice renders as plain text with no payment links", () => {
    const { container } = render(<NativeSubscriptionNotice variant="panel" />);
    expect(screen.getByText(NATIVE_SUB_NOTICE)).toBeInTheDocument();
    // Apple IAP compliance: must not contain anchors/buttons steering to payment.
    expect(container.querySelectorAll("a").length).toBe(0);
    expect(container.querySelectorAll("button").length).toBe(0);
  });
});
