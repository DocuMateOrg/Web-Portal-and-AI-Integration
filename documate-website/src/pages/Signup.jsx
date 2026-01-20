import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const signup = async () => {
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);

      alert("Account created successfully!");

      
      navigate("/login");
    } catch (error) {
      alert("Signup failed: " + error.message);
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-blue-900 to-cyan-700">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-[380px]">
        <h2 className="text-3xl font-bold text-center mb-2 text-blue-600">
          Create Account
        </h2>
        <p className="text-sm text-slate-500 text-center mb-6">
          Start digitizing your documents today
        </p>

        <input
          type="email"
          placeholder="Email address"
          className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 mb-6 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={signup}
          disabled={loading}
          className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Sign Up"}
        </button>

      
        <p className="text-sm text-center text-slate-500 mt-6">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/login")}
            className="text-blue-600 font-semibold cursor-pointer hover:underline"
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
}
