# School email and password login

Students use a school email and password. There is no username requirement.
Supabase Auth checks the password and manages verification emails and sessions.
Express verifies the resulting access token and enforces confirmed email, an
enabled school domain and active account status before granting application access.

## 1. Configure the development Supabase project

- Enable email/password signup in the Email authentication provider settings.
- Keep email confirmation enabled. Do not auto-confirm students for the acceptance test.
- Set the Site URL to the React app's local origin, for example `http://localhost:5173`.
- Allow the exact confirmation/recovery callback URL the frontend team implements,
  for example `http://localhost:5173/auth/callback`.
- Configure email delivery for the school mailbox being tested. Supabase's default
  email sender has restrictions; use configured SMTP when required.
- Agree on the project's password policy so frontend feedback matches Supabase validation.
- Follow [setup.md](setup.md) for database migrations, the enabled school/domain,
  private photo bucket, runtime credentials and `CORS_ORIGINS`.

## 2. Frontend integration contract

These examples are for the frontend/integration teammate; this guide does not modify
frontend screens. Use the existing Supabase browser client with its publishable or
legacy anon key. Never use the backend secret/service-role key in the browser.

Registration:

```js
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
});
```

Handle `error` before reporting success. When confirmation is required, registration
does not grant a usable signed-in session immediately. Show a check-your-email
message. The student follows the verification link; the frontend handles the Auth
callback/session flow appropriate to its Supabase client configuration.

Password login:

```js
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
if (error) throw error;

const response = await fetch(`${API_BASE}/me`, {
  headers: { Authorization: `Bearer ${data.session.access_token}` }
});
if (!response.ok) throw new Error('Unable to access the student account.');
const account = await response.json();
```

`API_BASE` includes `/api/v1`, for example `http://localhost:3000/api/v1`.
Handle the API's documented error codes in the real UI. A successful Supabase
login does not override a rejected school domain or suspended application account.
Use the current session access token for subsequent profile and photo requests.
Handle session refresh and logout through Supabase Auth.

There are no Express `/login`, `/register` or password-comparison endpoints.
Do not add password columns to `roommate.accounts` or `roommate.profiles`.

## 3. Existing email-link accounts and forgotten passwords

An existing magic-link account may not have a password yet. Use Supabase's password
recovery flow to set one rather than creating a duplicate account:

```js
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth/callback`
});
// After the recovery link establishes the authorized recovery session:
await supabase.auth.updateUser({ password: newPassword });
```

Both calls require error handling. The frontend teammate must implement the recovery
callback and new-password form. Never set another student's password with an admin
key in browser code.

## 4. Acceptance test with a real development project

1. Start the normal API with `npm.cmd start` after completing `setup.md`.
   The offline `npm.cmd run demo` server uses simulated authentication.
2. Register a new test account using an enabled school email and password.
3. Confirm password login fails before email verification. The protected API must
   also refuse an unverified identity if one is presented.
4. Open the real verification email and complete confirmation.
5. Try an incorrect password; Supabase must reject it without granting a session.
6. Log in with the correct password. Call `GET /api/v1/me` with the access token;
   expect 200 and onboarding state. Repeating it must not create duplicate accounts.
7. Create/read/edit a profile and verify its persistence after logging out and back in.
8. Check a request without a token gets 401, an unsupported confirmed school gets
   `SCHOOL_UNSUPPORTED`, and a suspended application account cannot gain access.
9. Exercise recovery for an existing email-link account and verify password login
   with its new password. Do not use production student accounts for these checks.

Automated backend tests simulate the Auth provider. They validate the application
gates but do not prove real password checking, email delivery or callback handling.
The hosted acceptance test remains outstanding until the development project and
frontend callback are available.

References: [password authentication](https://supabase.com/docs/guides/auth/passwords),
[password login](https://supabase.com/docs/reference/javascript/auth-signinwithpassword),
and [API contract](api.md).
