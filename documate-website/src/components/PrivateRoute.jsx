import { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

/**
 * PrivateRoute — wraps any route that requires authentication.
 *
 * Behaviour:
 *  - While Firebase is resolving the auth state → shows a centered spinner
 *    (prevents a flash-redirect to /login for already-logged-in users)
 *  - If authenticated  → renders the child element normally
 *  - If not authenticated → redirects to /login, preserving the intended
 *    path in `location.state.from` so Login can send the user back after
 *    a successful sign-in
 */
export default function PrivateRoute({ children }) {
  const location = useLocation();

  // null  = still loading  |  false = not logged in  |  object = user
  const [authState, setAuthState] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthState(user ?? false);
    });
    return unsubscribe; // cleanup listener on unmount
  }, []);

  // ── Loading: Firebase hasn't resolved the session yet ──────────────────
  if (authState === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-indigo-200 to-purple-200">
        <div className="flex flex-col items-center gap-4">
          {/* Spinner */}
          <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading…</p>
        </div>
      </div>
    );
  }

  // ── Not authenticated → redirect to login ─────────────────────────────
  if (!authState) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ── Authenticated → render the protected page ─────────────────────────
  return children;
}
