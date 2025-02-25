import { useEffect, useState } from 'react';
import './App.css';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('code')) {
      fetch(`${API_BASE_URL}/callback${window.location.search}`, {
        credentials: 'include',
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.access_token) {
            fetchUser();
          }
        })
        .catch((err) => console.error('Error:', err));
    }
  }, []);

  const login = () => {
    window.location.href = `${API_BASE_URL}/login`;
  };

  const fetchUser = () => {
    fetch(`${API_BASE_URL}/user`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch((err) => console.error('Error fetching user:', err));
  };

  return (
    <div className="container">
      <h1>OAuth2 PKCE Login</h1>
      {user ? (
        <div className="user-info">
          <h2>Welcome, {user.displayName}</h2>
          <p>Email: {user.mail}</p>
        </div>
      ) : (
        <button className="login-button" onClick={login}>Login with Azure</button>
      )}
    </div>
  );
}

export default App;
