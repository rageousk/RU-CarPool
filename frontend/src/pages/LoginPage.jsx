import React, { useState } from 'react';

const LoginPage = () => {
    const [isRegistering, setIsRegistering] = useState(false);

    const handleToggle = () => {
        setIsRegistering(!isRegistering);
    };

    const handleLogin = (e) => {
        e.preventDefault();
        // Add login logic here
        console.log('Logging in...');
    };

    const handleRegister = (e) => {
        e.preventDefault();
        // Add registration logic here
        console.log('Registering...');
    };

    return (
        <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
            <h2>{isRegistering ? 'Register' : 'Login'}</h2>
            <form onSubmit={isRegistering ? handleRegister : handleLogin}>
                {isRegistering && (
                    <div>
                        <label>
                            Name:
                            <input type="text" name="name" required />
                        </label>
                    </div>
                )}
                <div>
                    <label>
                        Email:
                        <input type="email" name="email" required />
                    </label>
                </div>
                <div>
                    <label>
                        Password:
                        <input type="password" name="password" required />
                    </label>
                </div>
                <button type="submit">{isRegistering ? 'Register' : 'Login'}</button>
            </form>
            <p>
                {isRegistering
                    ? 'Already have an account?'
                    : "Don't have an account?"}{' '}
                <button onClick={handleToggle} style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer' }}>
                    {isRegistering ? 'Login here' : 'Register here'}
                </button>
            </p>
        </div>
    );
};

export default LoginPage;