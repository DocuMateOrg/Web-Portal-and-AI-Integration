import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase"; 

function Login() {
  const login = async () => {
    try {
      await signInWithEmailAndPassword(auth, "test@gmail.com", "password123");
      alert("Logged in");
    } catch (error) {
      alert("Login failed: " + error.message);
      console.error(error);
    }
  };

  return <button onClick={login}>Login</button>;
}

export default Login;
