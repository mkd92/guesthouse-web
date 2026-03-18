<script>
  import '../app.css';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { initAuth, user, authLoading } from '$lib/stores/auth';
  import { pendingAction } from '$lib/stores/shortcuts';
  import { get } from 'svelte/store';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import TopBar from '$lib/components/TopBar.svelte';

  const publicRoutes = ['/login'];

  onMount(async () => {
    await initAuth();

    function handleKeydown(e) {
      if (!e.altKey) return;
      // Skip if typing in an input/textarea/select
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'KeyR') {
        e.preventDefault();
        pendingAction.set('new-room');
        if (!get(page).url.pathname.startsWith('/rooms')) goto('/rooms');
      }
      if (e.code === 'KeyP') {
        e.preventDefault();
        pendingAction.set('new-property');
        if (!get(page).url.pathname.startsWith('/properties')) goto('/properties');
      }
    }

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });

  $: {
    if (!$authLoading) {
      const isPublic = publicRoutes.some(r => $page.url.pathname.startsWith(r));
      if (!$user && !isPublic) goto('/login');
      if ($user && isPublic) goto('/dashboard');
    }
  }

  $: showLayout = $user && !publicRoutes.some(r => $page.url.pathname.startsWith(r));

  const pageTitles = {
    '/dashboard': 'Dashboard', '/rooms': 'PG Rooms',
    '/customers': 'Customers', '/transactions': 'Transactions',
    '/reports': 'Reports', '/staff': 'Staff',
    '/properties': 'Properties', '/units': 'Units',
    '/leases': 'Leases', '/expenses': 'Expenses',
    '/maintenance': 'Maintenance',
  };
  $: pageTitle = Object.entries(pageTitles).find(([k]) => $page.url.pathname.startsWith(k))?.[1] ?? 'Lobby';
</script>

<svelte:head>
  <meta name="theme-color" content="#f59e0b" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Lobby" />
  <link rel="apple-touch-icon" href="/icon-192.png" />
</svelte:head>

{#if $authLoading}
  <div class="min-h-screen flex items-center justify-center" style="background: var(--bg-base);">
    <div class="text-center">
      <div class="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3"
        style="border-color: var(--accent); border-top-color: transparent;"></div>
      <p class="text-sm" style="color: var(--text-3);">Loading…</p>
    </div>
  </div>

{:else if showLayout}
  <div class="flex min-h-screen">
    <!-- Desktop sidebar -->
    <div class="hidden md:block">
      <Sidebar />
    </div>

    <main class="flex-1 md:ml-60 min-h-screen flex flex-col" style="background: var(--bg-base);">
      <!-- Mobile top bar -->
      <TopBar title={pageTitle} />
      <!-- Page content -->
      <div class="flex-1 pb-16 md:pb-0">
        <slot />
      </div>
    </main>

    <!-- Mobile bottom nav -->
    <BottomNav />
  </div>

{:else}
  <slot />
{/if}
