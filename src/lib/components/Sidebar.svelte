<script>
  import { page } from '$app/stores';
  import { userProfile, isAdmin } from '$lib/stores/auth';
  import { supabase } from '$lib/supabase';
  import { goto } from '$app/navigation';

  const navItems = [
    { href: '/dashboard',    label: 'Dashboard',     icon: 'home' },
    { href: '/properties',   label: 'Properties',    icon: 'building' },
    { href: '/rooms',        label: 'PG Rooms',      icon: 'squares' },
    { href: '/units',        label: 'Units',         icon: 'storefront' },
    { href: '/leases',       label: 'Leases',        icon: 'document' },
    { href: '/customers',    label: 'Customers',     icon: 'users' },
    { href: '/transactions', label: 'Transactions',  icon: 'card' },
    { href: '/expenses',     label: 'Expenses',      icon: 'tag' },
    { href: '/accounts',     label: 'Accounts',      icon: 'wallet' },
    { href: '/maintenance',  label: 'Maintenance',   icon: 'wrench' },
    { href: '/reports',      label: 'Reports',       icon: 'chart' },
  ];

  const adminItems = [
    { href: '/staff', label: 'Staff', icon: 'usergroup' },
  ];

  const icons = {
    home:       'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
    building:   'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21',
    squares:    'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
    storefront: 'M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016 2.993 2.993 0 002.25-1.016 3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z',
    document:   'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
    users:      'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
    card:       'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z',
    tag:        'M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z M6 6h.008v.008H6V6z',
    wallet:     'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z',
    wrench:     'M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 11-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 016.336-4.486l-3.276 3.276a3.004 3.004 0 002.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852z',
    chart:      'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
    usergroup:  'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z',
  };

  async function logout() {
    await supabase.auth.signOut();
  }
</script>

<aside class="w-60 flex flex-col h-screen fixed left-0 top-0" style="background: var(--bg-surface); border-right: 1px solid var(--border);">

  <!-- Logo -->
  <div class="px-5 py-5 flex-shrink-0" style="border-bottom: 1px solid var(--border);">
    <div class="flex items-center gap-3">
      <div class="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 relative"
        style="background: var(--accent-dim); border: 1px solid rgba(245,158,11,0.25);">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent);">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>
      <div>
        <p class="font-bold text-[13px] leading-tight tracking-tight" style="color: var(--text-1);">RentRelay</p>
        <p class="text-[10px] font-medium" style="color: var(--text-3);">Manager</p>
      </div>
    </div>
  </div>

  <!-- Nav Links -->
  <nav class="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
    {#each navItems as item}
      {@const active = $page.url.pathname.startsWith(item.href)}
      <a
        href={item.href}
        class="group flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all relative"
        style={active
          ? 'background: var(--accent-dim); color: var(--text-1);'
          : 'color: var(--text-3);'}
      >
        {#if active}
          <span class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
            style="background: var(--accent);"></span>
        {/if}
        <svg
          class="w-[16px] h-[16px] flex-shrink-0 transition-colors"
          style={active ? 'color: var(--accent);' : 'color: var(--text-3);'}
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"
        >
          <path d={icons[item.icon]} />
        </svg>
        <span class="flex-1 group-hover:text-[var(--text-1)] transition-colors">{item.label}</span>
      </a>
    {/each}

    {#if $isAdmin}
      <div class="pt-3 mt-1.5" style="border-top: 1px solid var(--border);">
        <p class="px-3 mb-1.5 text-[9px] font-bold tracking-widest uppercase" style="color: var(--text-3);">Admin</p>
        {#each adminItems as item}
          {@const active = $page.url.pathname.startsWith(item.href)}
          <a
            href={item.href}
            class="group flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all relative"
            style={active
              ? 'background: var(--accent-dim); color: var(--text-1);'
              : 'color: var(--text-3);'}
          >
            {#if active}
              <span class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                style="background: var(--accent);"></span>
            {/if}
            <svg
              class="w-[16px] h-[16px] flex-shrink-0 transition-colors"
              style={active ? 'color: var(--accent);' : 'color: var(--text-3);'}
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"
            >
              <path d={icons[item.icon]} />
            </svg>
            <span class="group-hover:text-[var(--text-1)] transition-colors">{item.label}</span>
          </a>
        {/each}
      </div>
    {/if}
  </nav>

  <!-- User Profile -->
  <div class="p-3 flex-shrink-0" style="border-top: 1px solid var(--border);">
    <div class="flex items-center gap-2.5 px-2 py-2 rounded-xl">
      <div class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] flex-shrink-0"
        style="background: var(--accent-dim); color: var(--accent); border: 1px solid rgba(245,158,11,0.2);">
        {($userProfile?.name || 'U').charAt(0).toUpperCase()}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-[12px] font-semibold leading-tight truncate" style="color: var(--text-1);">{$userProfile?.name || 'User'}</p>
        <p class="text-[10px] capitalize font-medium" style="color: var(--text-3);">{$userProfile?.role || 'staff'}</p>
      </div>
      <button
        on:click={logout}
        title="Sign out"
        class="w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
        style="color: var(--text-3);"
        onmouseenter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-1)'; }}
        onmouseleave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
        </svg>
      </button>
    </div>
  </div>
</aside>
