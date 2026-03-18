<script>
  import { page } from '$app/stores';

  const primary = [
    { href: '/dashboard',    label: 'Home',     icon: 'home' },
    { href: '/customers',    label: 'Guests',   icon: 'users' },
    { href: '/rooms',        label: 'PG',       icon: 'squares' },
    { href: '/transactions', label: 'Payments', icon: 'card' },
  ];

  const secondary = [
    { href: '/leases',      label: 'Leases',      icon: 'document' },
    { href: '/properties',  label: 'Properties',  icon: 'building' },
    { href: '/expenses',    label: 'Finance',     icon: 'tag' },
    { href: '/accounts',    label: 'Accounts',    icon: 'wallet' },
    { href: '/maintenance', label: 'Maintenance', icon: 'wrench' },
    { href: '/reports',     label: 'Reports',     icon: 'chart' },
    { href: '/settings',    label: 'Settings',    icon: 'cog' },
  ];

  const icons = {
    home:     'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
    squares:  'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
    document: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
    users:    'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
    card:     'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z',
    building: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21',
    tag:      'M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z M6 6h.008v.008H6V6z',
    wallet:   'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z',
    wrench:   'M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 11-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 016.336-4.486l-3.276 3.276a3.004 3.004 0 002.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852z',
    chart:    'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
    grid:     'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
    cog:      'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.282c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
  };

  let showMore = false;
  $: isSecondaryActive = secondary.some(i => $page.url.pathname.startsWith(i.href));

  function closeMore() { showMore = false; }
</script>

<!-- More drawer backdrop -->
{#if showMore}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div
    class="fixed inset-0 z-40 md:hidden"
    style="background: rgba(0,0,0,0.5); backdrop-filter: blur(2px);"
    on:click={closeMore}
  ></div>

  <!-- More sheet -->
  <div class="fixed bottom-[57px] left-0 right-0 z-50 md:hidden rounded-t-2xl overflow-hidden"
    style="background: var(--bg-elevated); border-top: 1px solid var(--border-md); box-shadow: 0 -8px 32px rgba(0,0,0,0.4);">
    <div class="px-4 pt-4 pb-2">
      <p class="text-xs font-semibold uppercase tracking-widest mb-3" style="color: var(--text-3);">More</p>
      <div class="grid grid-cols-4 gap-2 pb-2">
        {#each secondary as item}
          {@const active = $page.url.pathname.startsWith(item.href)}
          <a href={item.href} on:click={closeMore}
            class="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all"
            style={active ? 'background: var(--accent-dim);' : 'background: var(--bg-hover);'}
          >
            <svg class="w-5 h-5" style={active ? 'color: var(--accent);' : 'color: var(--text-2);'}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
              stroke-linecap="round" stroke-linejoin="round">
              <path d={icons[item.icon]} />
            </svg>
            <span class="text-[10px] font-medium text-center leading-tight"
              style={active ? 'color: var(--accent);' : 'color: var(--text-2);'}>{item.label}</span>
          </a>
        {/each}
      </div>
    </div>
  </div>
{/if}

<!-- Bottom nav -->
<nav class="fixed bottom-0 left-0 right-0 z-40 md:hidden safe-bottom"
  style="background: rgba(11,13,20,0.96); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-top: 1px solid var(--border);">
  <div class="flex">
    {#each primary as item}
      {@const active = $page.url.pathname.startsWith(item.href)}
      <a href={item.href} on:click={closeMore}
        class="flex-1 flex flex-col items-center justify-center py-2.5 min-h-[57px] transition-all relative"
      >
        {#if active}
          <span class="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
            style="background: var(--accent);"></span>
        {/if}
        <div class="w-8 h-8 rounded-xl flex items-center justify-center"
          style={active ? 'background: var(--accent-dim);' : ''}>
          <svg class="w-[18px] h-[18px]"
            style={active ? 'color: var(--accent);' : 'color: var(--text-3);'}
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d={icons[item.icon]} />
          </svg>
        </div>
        <span class="text-[9px] font-semibold leading-tight mt-0.5"
          style={active ? 'color: var(--accent);' : 'color: var(--text-3);'}>{item.label}</span>
      </a>
    {/each}

    <!-- More button -->
    <button
      class="flex-1 flex flex-col items-center justify-center py-2.5 min-h-[57px] transition-all relative"
      on:click={() => showMore = !showMore}
    >
      {#if isSecondaryActive}
        <span class="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
          style="background: var(--accent);"></span>
      {/if}
      <div class="w-8 h-8 rounded-xl flex items-center justify-center"
        style={(showMore || isSecondaryActive) ? 'background: var(--accent-dim);' : ''}>
        <svg class="w-[18px] h-[18px]"
          style={(showMore || isSecondaryActive) ? 'color: var(--accent);' : 'color: var(--text-3);'}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"
          stroke-linecap="round" stroke-linejoin="round">
          <path d={icons['grid']} />
        </svg>
      </div>
      <span class="text-[9px] font-semibold leading-tight mt-0.5"
        style={(showMore || isSecondaryActive) ? 'color: var(--accent);' : 'color: var(--text-3);'}>More</span>
    </button>
  </div>
</nav>
