<script>
  import { supabase } from '$lib/supabase';
  import { goto } from '$app/navigation';

  let email = '';
  let password = '';
  let name = '';
  let isRegister = false;
  let loading = false;
  let googleLoading = false;
  let error = '';

  async function createProfile(uid, displayName, userEmail) {
    const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const isFirst = count === 0;
    await supabase.from('users').insert({
      id: uid,
      name: displayName,
      email: userEmail,
      role: isFirst ? 'admin' : 'staff',
    });
  }

  async function handleSubmit() {
    error = '';
    loading = true;
    try {
      if (isRegister) {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (data.user) await createProfile(data.user.id, name, email);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
      goto('/dashboard');
    } catch (e) {
      error = e.message?.includes('Invalid login credentials')
        ? 'Invalid email or password.'
        : e.message?.includes('already registered') || e.message?.includes('already been registered')
        ? 'Email already registered. Please log in.'
        : e.message || 'Something went wrong.';
    } finally {
      loading = false;
    }
  }

  async function signInWithGoogle() {
    error = '';
    googleLoading = true;
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (oauthError) throw oauthError;
      // Profile creation for Google is handled by the auth trigger in Supabase
    } catch (e) {
      error = e.message || 'Google sign-in failed.';
      googleLoading = false;
    }
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <!-- Logo -->
    <div class="text-center mb-8">
      <div class="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
        <svg class="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-white tracking-tight">Lobby</h1>
      <p class="text-slate-400 mt-1 text-sm">Guesthouse Manager</p>
    </div>

    <!-- Card -->
    <div class="bg-white rounded-2xl shadow-2xl p-8">
      <h2 class="text-[17px] font-bold text-slate-900 mb-6">
        {isRegister ? 'Create account' : 'Welcome back'}
      </h2>

      <!-- Google Sign-In -->
      <button
        type="button"
        class="w-full flex items-center justify-center gap-3 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors mb-5"
        disabled={googleLoading || loading}
        on:click={signInWithGoogle}
      >
        {#if googleLoading}
          <span class="inline-block w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></span>
        {:else}
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
        {/if}
        Continue with Google
      </button>

      <!-- Divider -->
      <div class="relative mb-5">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-slate-200"></div>
        </div>
        <div class="relative flex justify-center text-xs text-slate-400">
          <span class="bg-white px-3">or use email</span>
        </div>
      </div>

      <!-- Email / Password Form -->
      <form on:submit|preventDefault={handleSubmit} class="space-y-4">
        {#if isRegister}
          <div>
            <label class="label" for="name">Full Name</label>
            <input id="name" type="text" bind:value={name} class="input" placeholder="Your name" required />
          </div>
        {/if}

        <div>
          <label class="label" for="email">Email address</label>
          <input id="email" type="email" bind:value={email} class="input" placeholder="you@example.com" required />
        </div>

        <div>
          <label class="label" for="password">Password</label>
          <input id="password" type="password" bind:value={password} class="input" placeholder="••••••••" required minlength="6" />
        </div>

        {#if error}
          <p class="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl border border-red-100">{error}</p>
        {/if}

        <button type="submit" class="btn-primary w-full py-2.5 mt-2" disabled={loading || googleLoading}>
          {#if loading}
            <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          {/if}
          {isRegister ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <div class="mt-6 text-center text-sm text-slate-500">
        {isRegister ? 'Already have an account?' : "Don't have an account?"}
        <button
          class="text-blue-600 font-semibold hover:underline ml-1"
          on:click={() => { isRegister = !isRegister; error = ''; }}
        >
          {isRegister ? 'Sign in' : 'Register'}
        </button>
      </div>

      {#if !isRegister}
        <p class="mt-4 text-xs text-slate-400 text-center">
          First time? Register to create the admin account.
        </p>
      {/if}
    </div>
  </div>
</div>
